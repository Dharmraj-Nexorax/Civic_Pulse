import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminIntelligence() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/alerts', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/hotspots', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
    ])
      .then(([a, h]) => {
        setAlerts(Array.isArray(a?.alerts) ? a.alerts : []);
        setHotspots(Array.isArray(h?.hotspots) ? h.hotspots : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/admin" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Intelligence & System Alerts</span>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Active Rule-Based Alerts ({alerts.length})</h2>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Scanning system state…</div>
          ) : alerts.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>All operational thresholds within normal bounds.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((al, idx) => (
                <div key={idx} className="p-3 border rounded-md flex justify-between items-center" style={{ borderColor: '#000', background: '#fff' }}>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{al.title}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{al.message}</div>
                  </div>
                  <span className="badge badge-critical">{al.severity || 'ALERT'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Ward Hotspot Concentrations</h2>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Computing hotspots…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {hotspots.map((h, idx) => (
                <div key={idx} className="p-3 border rounded-md" style={{ borderColor: 'var(--border)', background: '#fff' }}>
                  <div className="font-semibold" style={{ color: 'var(--text)' }}>{h.ward_name}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Active Issues: {h.issue_count} · Surge Level: {h.level}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
