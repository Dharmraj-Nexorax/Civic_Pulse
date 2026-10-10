import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch(`/api/admin/issues${statusFilter ? `?status=${statusFilter}` : ''}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setIssues(Array.isArray(d?.issues) ? d.issues : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="btn btn-ghost text-sm">← Back</Link>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Issue Management</span>
          </div>
          <select className="input text-xs" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PRIORITIZED">Prioritized (Unassigned)</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved (Pending Citizen)</option>
            <option value="CITIZEN_VERIFIED">Citizen Verified</option>
            <option value="REOPENED">Reopened</option>
          </select>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>Loading issues…</div>
        ) : issues.length === 0 ? (
          <div className="card text-center py-12" style={{ color: 'var(--muted)' }}>
            No issues found matching criteria.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {issues.map(iss => (
              <Link
                key={iss.id}
                to={`/admin/issues/${iss.id}`}
                className="card flex items-center justify-between hover:shadow-md transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <div className="font-semibold text-base" style={{ color: 'var(--text)' }}>{iss.title}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {iss.category_name} · Ward: {iss.ward_name} · Score: {iss.priority_score} · Reports: {iss.complaint_count || 1}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-high">{iss.priority_override_band || iss.priority_band}</span>
                  <span className="status-pill">{iss.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
