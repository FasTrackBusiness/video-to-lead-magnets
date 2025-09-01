import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Verify() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('Verifying...');
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!token) return;
    axios.post(`${api}/auth/verify`, null, { params: { token }})
      .then(()=> setStatus('Email verified! You can close this tab.'))
      .catch(()=> setStatus('Verification failed or token invalid.'));
  }, [token]);

  return <main style={{maxWidth:600, margin:'40px auto', fontFamily:'sans-serif'}}>
    <h1>Email Verification</h1>
    <p>{status}</p>
  </main>
}
