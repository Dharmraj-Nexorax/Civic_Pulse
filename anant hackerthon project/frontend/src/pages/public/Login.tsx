import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || null;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const target = from || (user.role === 'ADMIN' ? '/admin' : user.role === 'WORKER' ? '/worker' : '/citizen');
      navigate(target, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Invalid credentials.');
        return;
      }
      login(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/" className="block text-center font-bold text-xl mb-8" style={{ color: 'var(--text)' }}>
          CivicPulse
        </Link>
        <div className="card">
          <h1 className="font-bold text-xl mb-6" style={{ color: 'var(--text)' }}>Sign in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Mobile or Email</label>
              <input
                className="input"
                type="text"
                placeholder="9876543210 or you@email.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--muted)' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Remember me for 7 days
            </label>
            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--section-gray)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--text)', fontWeight: 600 }}>Register as a citizen</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
