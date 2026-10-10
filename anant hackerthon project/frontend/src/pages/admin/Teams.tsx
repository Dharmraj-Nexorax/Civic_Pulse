import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/teams', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTeams(Array.isArray(d?.teams) ? d.teams : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
        setMsg('Team created successfully!');
        setName(''); setDescription('');
        load();
      } else {
        const d = await res.json();
        setMsg(d.error?.message || 'Failed to create team');
      }
    } catch { setMsg('Network error'); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/admin" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Department Teams</span>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {msg && <div className="p-3 bg-black text-white rounded-md text-sm">{msg}</div>}

        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Create Department Team</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input className="input" placeholder="Team Name (e.g. Sanitation Unit B)" value={name} onChange={e => setName(e.target.value)} required />
            <input className="input" placeholder="Description / Area of responsibility" value={description} onChange={e => setDescription(e.target.value)} />
            <button type="submit" className="btn btn-primary self-start">Create Team</button>
          </form>
        </div>

        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Existing Teams ({teams.length})</h2>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Loading teams…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map(t => (
                <div key={t.id} className="p-4 border rounded-md" style={{ borderColor: 'var(--border)', background: '#fff' }}>
                  <div className="font-semibold text-base" style={{ color: 'var(--text)' }}>{t.name}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{t.description || 'No description'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
