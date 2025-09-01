import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function Home() {
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [email, setEmail] = useState('owner@example.com');
  const [password, setPassword] = useState('changeme');
  const [token, setToken] = useState('');
  const [role, setRole] = useState('owner');
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [emailVerified, setEmailVerified] = useState(true);
  const [lowCredits, setLowCredits] = useState(false);
  const [modules, setModules] = useState({ toolbar: [[{ 'header': [1,2,3,false] }], ['bold','italic','underline'], [{'list':'ordered'},{'list':'bullet'}], ['link','clean']] });
  const [topupUrl, setTopupUrl] = useState('');
  const [hostname, setHostname] = useState('');
  const [domains, setDomains] = useState([]);
  const [priceId, setPriceId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState('');
  const [assetIds, setAssetIds] = useState([]);
  const [branding, setBranding] = useState({ name: 'Your Brand', primary_color: '#0ea5e9', accent_color: '#22c55e', logo_url: '', domain: '' });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [assetTitle, setAssetTitle] = useState('');
  const [ctaType, setCtaType] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchMe = async () => {
    if (!token) { setEmailVerified(null); return; }
    try {
      const res = await axios.get(`${api}/me`);
      setEmailVerified(!!res.data.email_verified);
    } catch {
      setEmailVerified(null);
    }
  };


  const doSignup = async () => {
    const res = await axios.post(`${api}/auth/signup`, { email, password, tenant_id: tenantId, role });
    setToken(res.data.token); axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    alert('Signed up & logged in'); fetchMe();
  };
  const doLogin = async () => {
    const res = await axios.post(`${api}/auth/login`, { email, password, tenant_id: tenantId });
    setToken(res.data.token); axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`; setRole(res.data.role);
    alert('Logged in'); fetchMe();
  };
  const fetchBalance = async () => {
    const res = await axios.get(`${api}/usage/balance`);
    setBalance(res.data.balance);
  };
  const topup = async (amt=20) => {
    await axios.post(`${api}/usage/topup`, { amount: amt });
    fetchBalance();
  };
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${api}/audit?limit=100`);
      setLogs(res.data.reverse());
    } catch (e) {
      console.warn('Audit fetch failed (need admin):', e?.response?.data);
    }
  };


  useEffect(() => {
    axios.defaults.headers.common['X-Tenant-Id'] = tenantId;
    const loadBranding = async () => {
      try {
        const res = await axios.get(`${api}/tenant/branding`);
        if (res.data) setBranding(res.data);
        // Apply CSS variables for theming
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', res.data?.primary_color || '#0ea5e9');
        root.style.setProperty('--brand-accent', res.data?.accent_color || '#22c55e');
      } catch {}
    };
    loadBranding();
  }, [tenantId]);


  const submitUrl = async () => {
    axios.defaults.headers.common['X-Tenant-Id'] = tenantId;
    const res = await axios.post(`${api}/jobs/url`, { video_url: videoUrl });
    setJobId(res.data.job_id);
  };

  const submitUpload = async () => {
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post(`${api}/jobs/upload`, form);
    setJobId(res.data.job_id);
  };

  const startCheckout = async () => { axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.common['X-Tenant-Id'] = tenantId;
    const res = await axios.post(`${api}/billing/stripe/checkout`, { tenant_id: tenantId, email });
    window.open(res.data.url, '_blank');
  };

  const managePortal = async () => {
    const res = await axios.post(`${api}/billing/stripe/portal`, { tenant_id: tenantId, email });
    window.open(res.data.url, '_blank');
  };

  const generate = async () => {
    try {
      const res = await axios.post(`${api}/generate`, {
        job_id: jobId,
        asset_types: ["ebook", "checklist", "cheat sheet", "one-page summary"],
        cta_type: "schedule a call",
        cta_url: "https://example.com/call"
      });
      setAssetIds(res.data.asset_ids);
      setTopupUrl('');
    } catch (err) {
      if (err?.response?.status === 402) {
        const url = err.response.headers['x-topup-url'];
        if (url) {
          setTopupUrl(url);
          alert('You are out of credits. Click "Top up credits" to continue.');
        } else {
          alert(err?.response?.data || 'Insufficient credits');
        }
      } else {
        alert('Generation failed');
      }
    }
  };

  const loadAsset = async (id) => {
    const res = await axios.get(`${api}/assets/${id}`);
    setSelectedAsset(res.data);
    setEditorContent(res.data.html);
    setAssetTitle(res.data.title);
    setCtaType(res.data.cta_type || '');
    setCtaUrl(res.data.cta_url || '');
  };

  const saveAsset = async () => {
    if (!selectedAsset) return;
    await axios.put(`${api}/assets/${selectedAsset.id}`, {
      title: assetTitle,
      html: editorContent,
      cta_type: ctaType,
      cta_url: ctaUrl
    });
    alert('Saved! Now re-export to DOCX/PDF.');
  };

  return (
    <main style={{maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif"}}>
      <header style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
  {branding.logo_url ? <img src={branding.logo_url} alt='logo' style={{height:40}}/> : null}
  <h1 style={{color:'var(--brand-primary)'}}>{branding.name || 'Video → Lead Magnets'}</h1>
</header>

      {/* Tiny banners */}
      {token && emailVerified === false && (
        <div className="tiny-banner" style={{background:'#fff8e1', border:'1px solid #ffe082', padding:8, borderRadius:8, marginBottom:12}}>
          <strong>Action needed:</strong> Please verify your email to enable generation and billing.
          <button style={{marginLeft:8}} onClick={async()=>{ await axios.post(`${api}/auth/send-verify`); alert('Verification email sent'); }}>Send Verify Email</button>
        </div>
      )}
      {balance !== null && balance < 10 && (
        <div className="tiny-banner" style={{background:'#e3f2fd', border:'1px solid #90caf9', padding:8, borderRadius:8, marginBottom:12}}>
          Low credits: {balance}. Generate may require a top-up.
          {topupUrl && <button style={{marginLeft:8}} onClick={()=>window.open(topupUrl,'_blank')}>Top up now</button>}
        </div>
      )}


      
      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 20}}>
        <h3>Usage Credits</h3>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={fetchBalance}>Refresh Balance</button>
          <span>Balance: {balance === null ? '—' : balance}</span>
          <button onClick={()=>topup(20)}>Top up +20 (admin only)</button>
        </div>
        <small>Generation consumes credits: 1 credit per asset draft (configurable).</small>
      </section>
      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 20}}>
        <h3>Audit Logs (admin only)</h3>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={fetchLogs}>Load Logs</button>
        </div>
        <ol>
          {logs.map((l,i)=> <li key={i}><code>{l.ts}</code> — <strong>{l.action}</strong> — {l.details}</li>)}
        </ol>
      </section>
    
      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 20}}>
        
      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 20}}>
        <h3>Tenant Branding</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <label>Name <input value={branding.name} onChange={e=>setBranding({...branding, name:e.target.value})} /></label>
          <label>Logo URL <input value={branding.logo_url||''} onChange={e=>setBranding({...branding, logo_url:e.target.value})} /></label>
          <label>Primary Color <input type="color" value={branding.primary_color} onChange={e=>{setBranding({...branding, primary_color:e.target.value}); document.documentElement.style.setProperty('--brand-primary', e.target.value);}} /></label>
          <label>Accent Color <input type="color" value={branding.accent_color} onChange={e=>{setBranding({...branding, accent_color:e.target.value}); document.documentElement.style.setProperty('--brand-accent', e.target.value);}} /></label>
          <label>Custom Domain <input value={branding.domain||''} onChange={e=>setBranding({...branding, domain:e.target.value})} /></label>
        </div>
        <button style={{marginTop:12}} onClick={async()=>{ await axios.put(`${api}/tenant/branding`, branding); alert('Branding saved'); }}>Save Branding</button>
      </section>
    
      <h3>1) Provide a video</h3>
        <div style={{display:"flex", gap:8, marginBottom:8}}>
          <input value={videoUrl} placeholder="YouTube or MP4 URL" onChange={e=>setVideoUrl(e.target.value)} style={{flex:1}}/>
          <button onClick={submitUrl}>Submit URL</button>
        </div>
        <div>
          <input type="file" onChange={e=>setFile(e.target.files[0])}/>
          <button onClick={submitUpload} disabled={!file}>Upload File</button>
        </div>
        {jobId && <p>Job created: <code>{jobId}</code></p>}
      </section>

      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 20}}>
        <h3>2) Generate assets</h3>
        <button onClick={generate} disabled={!jobId}>Generate</button>
      </section>

      <section style={{border: "1px solid #ddd", padding: 16, borderRadius: 8}}>
        <h3>3) Downloads & Editor</h3>
        {assetIds.length === 0 && <p>No assets yet.</p>}
        <ul>
          {assetIds.map(id => (
            <li key={id}>
              <a href={`${api}/export/docx/${id}`} target="_blank" rel="noreferrer">DOCX</a> |{" "}
              <a href={`${api}/export/pdf/${id}`} target="_blank" rel="noreferrer">PDF</a> |{" "}
              <button onClick={() => loadAsset(id)}>Edit</button>
            </li>
          ))}
        </ul>

        {selectedAsset && (
          <div style={{marginTop:20, padding:16, border:"1px solid #aaa"}}>
            <h3>Editor for {selectedAsset.type}</h3>
            <label>Title: <input value={assetTitle} onChange={e=>setAssetTitle(e.target.value)} style={{width:"100%"}}/></label>
            <br/>
            <label>CTA Type: <input value={ctaType} onChange={e=>setCtaType(e.target.value)} style={{width:"100%"}}/></label>
            <br/>
            <label>CTA URL: <input value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)} style={{width:"100%"}}/></label>
            <br/>
            <textarea value={editorContent} onChange={e=>setEditorContent(e.target.value)} style={{width:"100%", height:300, marginTop:8}}/>
            <br/>
            <button onClick={saveAsset}>Save</button>
          </div>
        )}
      </section>
    </main>
  );
}
