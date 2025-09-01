# Video to Lead Magnets – Repo Scaffold (Fast Path)

This is a ready-to-deploy scaffold for a web app that ingests a video (upload or URL), creates/retrieves a transcript, and generates lead magnet assets (eBook, checklist, cheat sheet, one-pager) with CTA blocks. It includes:
- **web/** (Next.js app for Admin UI)
- **api/** (FastAPI backend API)
- **worker/** (background jobs for transcription + generation + export)
- **infrastructure/** (Docker & Compose for local/dev deployment)
- **prompts/** (prompt packs aligned with your writing rules)
- **exporters/** (DOCX/PDF exporters)

## Quick start (local via Docker)
1. Copy `.env.example` to `.env` in root and each service folder, then set values (temporary defaults are included).
2. Run:
   ```bash
   docker compose -f infrastructure/docker-compose.yml up --build
   ```
3. Visit **http://localhost:3000** (web).
4. API is at **http://localhost:8000**.
5. MinIO (S3-compatible) console at **http://localhost:9001** (user: `minioadmin`, pass: `minioadmin`).

> For production, point to your **real Postgres, S3, and Stripe** credentials. See `infrastructure/DEPLOYMENT.md`.

## What works now
- **YouTube URLs:** real transcript fetch (no API keys required).
- **File uploads (.mp4/.mov/etc.):** local **OpenAI Whisper** transcription (no API key). ffmpeg is included in the worker image.
- Generate draft assets (eBook, checklist, cheat sheet, one-pager) and **download DOCX**.

## Transcription engines
- **YouTube URLs:** uses `youtube-transcript-api` to pull transcripts when available.
- **Uploads (Whisper):** set `WHISPER_MODEL` env to one of: `tiny`, `base` (default), `small`, `medium`, `large`.
  Larger models are more accurate but slower.

## Next steps (fastest path)
- Swap draft generators with structured content prompts.
- Add PDF export (HTML→PDF).
- Add editor & versioning.
- Add SaaS (multi-tenant + Stripe) and white-labeling.


## Multi-tenant (SaaS) – fast-path
- The API expects an `X-Tenant-Id` header. The web UI sets this for you based on the Tenant ID input.
- Jobs, transcripts, and assets are stored with `tenant_id` for isolation.
- This is a scaffold; add proper auth (JWT/OAuth) before production.

## Stripe billing (scaffold)
- Set in `api/.env`:
  - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_APP_URL`
- Create a webhook in Stripe dashboard pointing to `/billing/stripe/webhook`.
- Click **Start Subscription** in the UI to open a Checkout Session.
- Webhook updates subscription status in `billing_customers` (basic example).


## Branding (white-label)
- Per-tenant branding stored in DB: name, colors, logo URL, domain.
- UI lets you edit branding and instantly applies CSS variables.
- For custom domains, map DNS to your ingress and route to the same app. The `domain` field is metadata for your routing layer.


## Email verification & password reset
- Configure Postmark in `api/.env` (`POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM`, `PUBLIC_APP_URL`).
- Buttons in the UI send verification and forgot-password emails.
- Next.js routes: `/verify?token=...` and `/reset?token=...` handle the links.

## Auto top-ups (Stripe)
- Set `TOPUP_PRICE_ID`, `TOPUP_THRESHOLD`, `TOPUP_PACK_CREDITS`.
- When credits are insufficient, the API returns **402** with `X-Topup-Url` header to a Stripe Checkout session for a top-up pack.
- Webhook (`/billing/stripe/webhook`) adds credits on completed payment.

## Custom domains
- `POST /domains/add` → returns a TXT record to set (`_vtlm.<hostname> = <token>`).
- `POST /domains/verify` → marks verified (in production, check DNS).
- Requests with `Host` matching a verified domain will resolve the tenant automatically.

## Tailwind + UI polish
- Tailwind and CSS variables are included for quick theming.
- You can gradually convert components to Tailwind/shadcn patterns without blocking current features.
