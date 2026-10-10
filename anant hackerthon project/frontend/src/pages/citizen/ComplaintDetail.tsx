import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { civicPinIcon } from '../../components/LocationPickerMap';
import { StatusChip, PriorityBadge, LifecycleTimeline, IssueStatus } from '../../components/CivicUI';

interface ComplaintDetail {
  complaint_id: string;
  complaint_no: string;
  issue_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  status_label: string;
  next_step_text: string;
  created_at: string;
  category_name: string;
  ward_name: string;
  lat?: number;
  lng?: number;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  location_method?: string | null;
  priority_band: any;
  priority_score: number | null;
  assigned_team_name: string | null;
  resolution_summary: string | null;
  resolution_notes: string | null;
  resolution_proof_urls: string[];
  can_verify: boolean;
  reopened_count: number;
  events: any[];
}

export default function CitizenComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'VERIFIED' | 'REJECTED' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`/api/citizen/complaints/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d?.issue || d || null); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleVerify = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !rejectReason.trim()) { setErr('Please provide a reason.'); return; }
    setErr('');
    setActing(true);
    try {
      const res = await fetch(`/api/citizen/complaints/${id}/verify`, { // Assumed id is complaintId
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reject_reason: rejectReason || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error?.message || 'Failed.'); return; }
      setAction(null);
      load();
    } catch { setErr('Network error.'); }
    finally { setActing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Loading...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Complaint not found.</div>;

  // Process timeline events
  const timelineEvents = data.events?.filter(e => e.to_status).map(e => ({
    status: e.to_status as IssueStatus,
    timestamp: e.created_at,
    isCurrent: e.to_status === data.status
  })) || [];
  // Add initial REPORTED event if missing
  if (!timelineEvents.find(e => e.status === 'REPORTED')) {
    timelineEvents.unshift({ status: 'REPORTED', timestamp: data.created_at, isCurrent: data.status === 'REPORTED' });
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/citizen/complaints" className="btn btn-ghost text-sm">← My Complaints</Link>
          <span className="font-semibold text-sm" style={{ color: 'var(--muted)' }}>#{data.complaint_no}</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
        {/* Header */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>{data.title || data.description.slice(0, 80)}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>{data.category_name} • {data.ward_name}</div>
            </div>
            <StatusChip status={data.status} />
          </div>
          <div className="text-sm" style={{ color: 'var(--text)' }}>{data.description}</div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
            <span>Submitted {new Date(data.created_at).toLocaleString()}</span>
            {data.priority_band && <PriorityBadge band={data.priority_band} />}
            {data.assigned_team_name && <span>• Team: {data.assigned_team_name}</span>}
          </div>
        </div>

        {/* Lifecycle Timeline */}
        <div className="card">
          <div className="font-semibold mb-2 text-[var(--text)]">Issue Progress</div>
          <LifecycleTimeline events={timelineEvents} hasReopened={(data.reopened_count || 0) > 0} />
        </div>

        {/* Next step */}
        {data.next_step_text && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--section-gray)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <span className="font-semibold">What's next: </span>{data.next_step_text}
          </div>
        )}

        {/* Location & Map Card */}
        {typeof data.lat === 'number' && typeof data.lng === 'number' && !isNaN(data.lat) && !isNaN(data.lng) && (
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Issue Location
              </span>
              <span className="badge text-[10px]">
                {data.location_method === 'GPS' ? '📍 GPS Acquired' : '🗺️ Map Selected'}
              </span>
            </div>

            {data.address && (
              <div className="text-sm" style={{ color: 'var(--text)' }}>
                📍 {data.address}
              </div>
            )}

            <div className="rounded-xl overflow-hidden border mt-1" style={{ height: 180, borderColor: 'var(--border)' }}>
              <MapContainer
                center={[data.lat, data.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[data.lat, data.lng]} icon={civicPinIcon} />
              </MapContainer>
            </div>
          </div>
        )}

        {/* Resolution */}
        {data.resolution_summary && (
          <div className="card flex flex-col gap-2">
            <div className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Resolution Report</div>
            <div className="text-sm" style={{ color: 'var(--text)' }}>{data.resolution_summary}</div>
            {data.resolution_notes && <div className="text-sm" style={{ color: 'var(--muted)' }}>{data.resolution_notes}</div>}
            {data.resolution_proof_urls && data.resolution_proof_urls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.resolution_proof_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
                    View Proof {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verify */}
        {data.can_verify && (
          <div className="card flex flex-col gap-3" style={{ border: '2px solid var(--text)' }}>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>
              📋 Worker claims this is resolved. Do you agree?
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Only you (as the reporter) can verify or reject this resolution. Your verification is final.
            </p>
            {action === 'REJECTED' && (
              <textarea
                className="input"
                placeholder="Why is this not resolved? (required)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ minHeight: 80 }}
              />
            )}
            {err && <div className="text-sm" style={{ color: 'var(--text)' }}>{err}</div>}
            <div className="flex gap-3">
              <button className="btn btn-primary" disabled={acting} onClick={() => handleVerify('VERIFIED')}>
                ✅ Yes, it's fixed
              </button>
              <button className="btn btn-outline" disabled={acting} onClick={() => {
                setAction('REJECTED');
                if (action === 'REJECTED') handleVerify('REJECTED');
              }}>
                {action === 'REJECTED' ? '📤 Submit Rejection' : '❌ Not Fixed'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
