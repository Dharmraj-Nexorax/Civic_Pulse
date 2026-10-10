import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/workers', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setWorkers(Array.isArray(d?.workers) ? d.workers : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/admin/teams', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setTeams(Array.isArray(d?.teams) ? d.teams : []))
      .catch(() => {});
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: name, mobile, email, password, team_id: teamId })
      });
      if (res.ok) {
        setMsg('Worker created successfully!');
        setName(''); setMobile(''); setEmail(''); setPassword('');
        load();
      } else {
        const d = await res.json();
        setMsg(d.error?.message || 'Failed to create worker');
      }
    } catch { setMsg('Network error'); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/admin" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Worker Directory</span>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {msg && <div className="p-3 bg-black text-white rounded-md text-sm">{msg}</div>}

        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Register New Field Worker</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
            <input className="input" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} required />
            <input className="input" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Initial Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <select className="input sm:col-span-2" value={teamId} onChange={e => setTeamId(e.target.value)} required>
              <option value="">Select Team / Department…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="submit" className="btn btn-primary justify-self-start">Create Worker</button>
          </form>
        </div>

        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Active Workers ({workers.length})</h2>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Loading workers…</div>
          ) : (
            <div className="flex flex-col gap-2">
              {workers.map(w => (
                <div key={w.id} className="p-3 border rounded-md flex justify-between items-center" style={{ borderColor: 'var(--border)', background: '#fff' }}>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>{w.full_name}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      Team: {w.team_name || 'None'} · Mobile: {w.mobile || '—'}
                    </div>
                  </div>
                  <span className="badge">{w.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
