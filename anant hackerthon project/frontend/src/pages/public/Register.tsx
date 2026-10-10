import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface Ward { id: string; name: string; }

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState({ full_name: '', mobile: '', email: '', password: '', ward_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) { navigate('/citizen', { replace: true }); return; }
    fetch('/api/public/wards')
      .then(r => r.ok ? r.json() : [])
      .then(d => setWards(Array.isArray(d) ? d : []))
      .catch(() => setWards([]));
  }, [user, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.ward_id) { setError('Please select your ward.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || 'Registration failed.'); return; }
      login(data.user);
      navigate('/citizen', { replace: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--surface)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Link to="/" className="block text-center font-bold text-xl mb-8" style={{ color: 'var(--text)' }}>CivicPulse</Link>
        <div className="card">
          <h1 className="font-bold text-xl mb-1" style={{ color: 'var(--text)' }}>Create a Citizen Account</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Join to report and track civic issues in your area.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.full_name} onChange={set('full_name')} required minLength={2} />
            </div>
            <div>
              <label className="label">Mobile Number <span style={{ color: 'var(--muted)' }}>(required)</span></label>
              <input className="input" type="tel" placeholder="9876543210" value={form.mobile} onChange={set('mobile')} required />
            </div>
            <div>
              <label className="label">Email <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
              <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <div>
              <label className="label">Your Ward</label>
              <select className="input" value={form.ward_id} onChange={set('ward_id')} required>
                <option value="">Select ward…</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--section-gray)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--text)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
