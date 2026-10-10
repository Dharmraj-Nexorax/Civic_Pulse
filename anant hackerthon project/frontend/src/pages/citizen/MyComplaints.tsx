import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Complaint {
  complaint_id: string;
  complaint_no: string;
  issue_id: string;
  title: string;
  description: string;
  status: string;
  status_label: string;
  created_at: string;
  category_name: string;
  ward_name: string;
  priority_band: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  REPORTED: '#a0a09f',
  UNDER_VERIFICATION: '#a0a09f',
  GROUPED: '#555',
  PRIORITIZED: '#555',
  ASSIGNED: '#333',
  IN_PROGRESS: '#333',
  RESOLVED: '#a0a09f',
  CITIZEN_VERIFIED: '#000',
  CITIZEN_REJECTED: '#555',
  REOPENED: '#333',
  DUPLICATE: '#ccc',
};

export default function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/citizen/complaints', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setComplaints(Array.isArray(d?.complaints) ? d.complaints : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/citizen" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>My Complaints</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : complaints.length === 0 ? (
          <div className="card flex flex-col items-center gap-4 py-12">
            <div className="text-4xl">📭</div>
            <p style={{ color: 'var(--muted)' }}>No complaints yet.</p>
            <Link to="/citizen/report" className="btn btn-primary">Report Your First Issue</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {complaints.map(c => (
              <Link
                key={c.complaint_id}
                to={`/citizen/complaints/${c.complaint_id}`}
                className="card flex flex-col gap-2 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.title || c.description.slice(0, 60)}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      #{c.complaint_no} · {c.category_name} · {c.ward_name}
                    </div>
                  </div>
                  <span
                    className="status-pill flex-shrink-0"
                    style={{ background: STATUS_COLORS[c.status] || '#eee', color: STATUS_COLORS[c.status] === '#000' ? '#fff' : '#333' }}
                  >
                    {c.status_label}
                  </span>
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(c.created_at).toLocaleDateString()}
                  {c.priority_band && ` · Priority: ${c.priority_band}`}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
