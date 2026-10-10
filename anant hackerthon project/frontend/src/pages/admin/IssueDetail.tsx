import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusChip, PriorityBadge, PriorityBreakdownTable } from '../../components/CivicUI';

export default function AdminIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [priorityOverride, setPriorityOverride] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/issues/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setIssue(d?.issue || null); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/admin/workers', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setWorkers(Array.isArray(d?.workers) ? d.workers : []))
      .catch(() => {});
  };

  useEffect(load, [id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setSubmitting(true);
    const w = workers.find(x => x.id === selectedWorker);
    try {
      const res = await fetch(`/api/admin/issues/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          worker_id: selectedWorker,
          team_id: w?.team_id,
          reassign_reason: reassignReason || undefined
        })
      });
      if (res.ok) { setMsg('Worker assigned successfully!'); load(); }
      else { const d = await res.json(); setMsg(d.error?.message || 'Assignment failed'); }
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleOverridePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityOverride || !overrideReason) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priority_override_band: priorityOverride,
          priority_override_reason: overrideReason
        })
      });
      if (res.ok) { setMsg('Priority overridden!'); load(); }
      else { const d = await res.json(); setMsg(d.error?.message || 'Override failed'); }
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading issue...</div>;
  if (!issue) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Issue not found.</div>;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/admin/issues" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Admin Issue Triage</span>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {msg && <div className="p-3 bg-black text-white rounded-md text-sm">{msg}</div>}

        <div className="card flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{issue.title}</h1>
            <StatusChip status={issue.status} />
          </div>
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
            <span>Category: {issue.category_name}</span> • <span>Ward: {issue.ward_name}</span> • 
            <span className="flex items-center gap-1">Priority: <PriorityBadge band={issue.priority?.effective_band || issue.priority_band} /></span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text)' }}>
            <strong>Summary:</strong> {issue.summary || 'No summary available.'}
          </div>
        </div>

        {/* Priority Breakdown Table */}
        {issue.priority && issue.priority.factors && (
          <PriorityBreakdownTable 
            factors={issue.priority.factors} 
            total={issue.priority.score} 
            band={issue.priority.effective_band} 
          />
        )}

        {/* Priority Override */}
        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Manual Priority Override</h2>
          <form onSubmit={handleOverridePriority} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <select className="input flex-1" value={priorityOverride} onChange={e => setPriorityOverride(e.target.value)} required>
                <option value="">Select Priority Band...</option>
                <option value="CRITICAL">CRITICAL (Emergency / Life safety)</option>
                <option value="HIGH">HIGH (Major disruption)</option>
                <option value="MEDIUM">MEDIUM (Standard civic issue)</option>
                <option value="LOW">LOW (Minor aesthetic / routine)</option>
              </select>
            </div>
            <input
              className="input"
              placeholder="Mandatory reason for priority override (e.g. VIP visit, school zone)"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              required
            />
            <button type="submit" disabled={submitting} className="btn btn-outline self-start">
              Update Priority
            </button>
          </form>
        </div>

        {/* Worker Assignment */}
        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Assign / Reassign Worker</h2>
          <form onSubmit={handleAssign} className="flex flex-col gap-3">
            <select className="input" value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)} required>
              <option value="">Select Worker...</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.full_name} ({w.team_name || 'No Team'}) - Active load: {w.active_count || 0}
                </option>
              ))}
            </select>
            {issue.assigned_worker_id && (
              <input
                className="input"
                placeholder="Reason for reassignment (required when reassigning)"
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                required
              />
            )}
            <button type="submit" disabled={submitting} className="btn btn-primary self-start">
              Assign Worker
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
