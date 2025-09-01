import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Reset() {
  const router = useRouter();
  const { token } = router.query;
  const [pwd, setPwd] = useState('');
  const [status, setStatus] = useState('');

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const submit = async () => {
    try {
      await axios.post(`${api}/auth/reset`, { token, new_password: pwd });
      setStatus('Password changed. You may close this tab and log in.');
    } catch {
      setStatus('Reset failed. Try requesting a new link.');
    }
  };

  return <main style={{maxWidth:600, margin:'40px auto', fontFamily:'sans-serif'}}>
    <h1>Reset Password</h1>
    <input type="password" placeholder="New password" value={pwd} onChange={e=>setPwd(e.target.value)} />
    <button onClick={submit} style={{marginLeft:8}}>Reset</button>
    <p>{status}</p>
  </main>
}
