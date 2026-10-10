import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface WorkerIssue {
  id: string;
  title: string;
  category_name: string;
  ward_name: string;
  status: string;
  priority_band: string;
  priority_score: number;
  assigned_at: string;
  sla_deadline?: string;
}

export default function WorkerMyIssues() {
  const [issues, setIssues] = useState<WorkerIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/worker/issues', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setIssues(Array.isArray(d?.issues) ? d.issues : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/worker" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>My Assigned Tasks</span>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>Loading assigned tasks…</div>
        ) : issues.length === 0 ? (
          <div className="card text-center py-12" style={{ color: 'var(--muted)' }}>
            No tasks currently assigned to you.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {issues.map(iss => (
              <Link
                key={iss.id}
                to={`/worker/issues/${iss.id}`}
                className="card flex flex-col gap-2 hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base" style={{ color: 'var(--text)' }}>{iss.title}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {iss.category_name} · {iss.ward_name} · Score: {iss.priority_score}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-high">{iss.priority_band}</span>
                    <span className="status-pill">{iss.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
