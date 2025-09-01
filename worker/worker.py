import os, time, urllib.parse, re, tempfile, boto3
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(DATABASE_URL)

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
S3_BUCKET = os.getenv("S3_BUCKET", "uploads")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")

def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )

class Job(SQLModel, table=True):
    tenant_id: str = Field(index=True)
    id: str = Field(primary_key=True)
    source_type: str
    source_ref: str
    status: str = "queued"

class Transcript(SQLModel, table=True):
    tenant_id: str = Field(index=True)
    id: str = Field(primary_key=True)
    job_id: str = Field(index=True)
    raw_text: str = ""
    cleaned_text: str = ""

def init_db():
    SQLModel.metadata.create_all(engine)

def extract_youtube_id(url: str) -> Optional[str]:
    try:
        u = urllib.parse.urlparse(url)
        if u.netloc in ("youtu.be", "www.youtu.be"):
            return u.path.strip("/")
        if "youtube.com" in u.netloc:
            qs = urllib.parse.parse_qs(u.query)
            if "v" in qs:
                return qs["v"][0]
            m = re.search(r"/(shorts|live)/([A-Za-z0-9_-]{6,})", u.path)
            if m:
                return m.group(2)
        return None
    except Exception:
        return None

def fetch_youtube_transcript(video_url: str) -> Optional[str]:
    vid = extract_youtube_id(video_url)
    if not vid:
        return None
    try:
        s_list = YouTubeTranscriptApi.list_transcripts(vid)
        preferred = ["en", "en-US", "en-GB"]
        transcript = None
        for code in preferred:
            try:
                transcript = s_list.find_manually_created_transcript([code])
                break
            except Exception:
                try:
                    transcript = s_list.find_generated_transcript([code])
                    break
                except Exception:
                    continue
        if transcript is None:
            transcript = s_list.find_transcript([tr.language_code for tr in s_list])
        entries = transcript.fetch()
        text = " ".join([e["text"] for e in entries if e.get("text")])
        text = re.sub(r"\s+", " ", text).strip()
        return text
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable):
        return None
    except Exception:
        return None

def transcribe_upload_from_s3(key: str) -> str:
    cli = s3_client()
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(key)[1] or ".mp4", delete=False) as tmp:
        cli.download_fileobj(S3_BUCKET, key, tmp)
        tmp_path = tmp.name
    import whisper
    model_name = os.getenv("WHISPER_MODEL", "base")
    model = whisper.load_model(model_name)
    result = model.transcribe(tmp_path)
    text = result.get("text", "").strip()
    if not text:
        text = "Transcription produced no text."
    return text

def run_once():
    with Session(engine) as s:
        q = select(Job).where(Job.status=="queued")
        job = s.exec(q).first()
        if not job:
            return False
        job.status = "transcribing"; s.add(job); s.commit()

        if job.source_type == "url":
            txt = fetch_youtube_transcript(job.source_ref)
            if txt:
                raw = cleaned = txt
            else:
                raw = cleaned = "Transcript unavailable or disabled for this YouTube URL."
        else:
            try:
                txt = transcribe_upload_from_s3(job.source_ref)
                raw = cleaned = txt
            except Exception as e:
                raw = cleaned = f"Upload transcription failed: {e}"

        tr = Transcript(id=os.urandom(8).hex(), tenant_id=job.tenant_id, job_id=job.id, raw_text=raw, cleaned_text=cleaned)
        s.add(tr); s.commit()
        job.status = "waiting_generation"
        s.add(job); s.commit()
        return True

def run():
    init_db()
    while True:
        progressed = run_once()
        if not progressed:
            time.sleep(2)

if __name__ == "__main__":
    run()
