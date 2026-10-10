import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setNotes(Array.isArray(d?.notifications) ? d.notifications : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    load();
  };

  const markOne = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' });
    setNotes(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/citizen" className="btn btn-ghost text-sm">← Back</Link>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Notifications</span>
          </div>
          <button className="btn btn-ghost text-sm" onClick={markAll}>Mark all read</button>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : notes.length === 0 ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>No notifications.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map(n => (
              <div
                key={n.id}
                className="card flex gap-3 cursor-pointer"
                style={{ opacity: n.is_read ? 0.6 : 1, background: n.is_read ? 'var(--surface)' : '#fff' }}
                onClick={() => !n.is_read && markOne(n.id)}
              >
                {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000', flexShrink: 0, marginTop: 5 }} />}
                <div className="flex flex-col gap-1 flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{n.title}</div>
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>{n.body}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
