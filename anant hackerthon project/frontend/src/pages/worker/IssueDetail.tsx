import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusChip, PriorityBadge, LifecycleTimeline, AiBadge } from '../../components/CivicUI';

export default function WorkerIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [resNotes, setResNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`/api/worker/issues/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setIssue(d?.issue || null); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleStartWork = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/worker/issues/${id}/start`, { method: 'POST', credentials: 'include' });
      if (res.ok) { setMsg('Work started!'); load(); }
      else { const d = await res.json(); setMsg(d.error?.message || 'Failed to start work'); }
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/worker/issues/${id}/note`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (res.ok) { setMsg('Note added'); setNote(''); load(); }
      else { const d = await res.json(); setMsg(d.error?.message || 'Failed'); }
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resNotes || !files || files.length === 0) { setMsg('Notes and at least 1 proof photo required.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('note', resNotes);
      Array.from(files).forEach(f => fd.append('proof', f));
      const res = await fetch(`/api/worker/issues/${id}/resolve`, { method: 'POST', credentials: 'include', body: fd });
      if (res.ok) { setMsg('Issue resolved. Awaiting citizen confirmation.'); load(); }
      else { const d = await res.json(); setMsg(d.error?.message || 'Failed to resolve'); }
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading...</div>;
  if (!issue) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Issue not found.</div>;

  // Process timeline events
  const timelineEvents = issue.events?.filter((e: any) => e.to_status).map((e: any) => ({
    status: e.to_status,
    timestamp: e.created_at,
    isCurrent: e.to_status === issue.status
  })) || [];
  if (!timelineEvents.find((e: any) => e.status === 'REPORTED') && issue.created_at) {
    timelineEvents.unshift({ status: 'REPORTED', timestamp: issue.created_at, isCurrent: issue.status === 'REPORTED' });
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/worker/issues" className="btn btn-ghost text-sm">← Back to My Issues</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {msg && <div className="p-3 bg-black text-white rounded-md text-sm">{msg}</div>}

        {/* Issue Details */}
        <div className="card flex flex-col gap-3">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{issue.title}</h1>
            <StatusChip status={issue.status} />
          </div>
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
            <span>Category: {issue.category_name}</span> • 
            <span>Ward: {issue.ward_name}</span> • 
            <span className="flex items-center gap-1">Priority: <PriorityBadge band={issue.priority?.effective_band || issue.priority_band} /></span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text)' }}>
            <strong>Summary:</strong> {issue.summary || issue.description}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            <a href={`https://www.openstreetmap.org/?mlat=${issue.lat}&mlon=${issue.lng}#map=18/${issue.lat}/${issue.lng}`} target="_blank" rel="noreferrer" className="underline hover:text-black">
              View on OpenStreetMap
            </a>
          </div>
        </div>

        {/* Lifecycle Timeline */}
        <div className="card">
          <div className="font-semibold mb-2 text-[var(--text)]">Issue Progress</div>
          <LifecycleTimeline events={timelineEvents} hasReopened={(issue.reopened_count || 0) > 0} />
        </div>

        {/* Actions based on status */}
        {(issue.status === 'ASSIGNED' || issue.status === 'REOPENED') && (
          <div className="card flex flex-col gap-3" style={{ border: '2px solid var(--black)' }}>
            <h2 className="font-bold text-[var(--text)]">Action Required</h2>
            <p className="text-sm text-[var(--muted)]">You have been assigned to this issue. Please review the details and start work when you arrive on site.</p>
            <button onClick={handleStartWork} disabled={submitting} className="btn btn-primary self-start">
              Accept & Start Work
            </button>
          </div>
        )}

        {issue.status === 'IN_PROGRESS' && (
          <div className="flex flex-col gap-4">
            <div className="card">
              <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Add Progress Note (Internal)</h2>
              <form onSubmit={handleAddNote} className="flex flex-col gap-3">
                <textarea className="input" placeholder="e.g. Parts ordered, waiting for delivery..." value={note} onChange={e => setNote(e.target.value)} required />
                <button type="submit" disabled={submitting} className="btn btn-outline self-start">Save Note</button>
              </form>
            </div>

            <div className="card" style={{ border: '2px solid var(--black)' }}>
              <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Mark as Resolved</h2>
              <form onSubmit={handleResolve} className="flex flex-col gap-4">
                <div>
                  <label className="label">Resolution Notes</label>
                  <textarea className="input" placeholder="Detail the work performed. This will be sent to the citizen." value={resNotes} onChange={e => setResNotes(e.target.value)} required style={{ minHeight: 80 }} />
                </div>
                <div>
                  <label className="label">Proof Photos (Required)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="text-sm" required />
                </div>
                <button type="submit" disabled={submitting} className="btn btn-primary self-start">
                  Submit Resolution
                </button>
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Resolved is not closed — the citizen must confirm</p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
