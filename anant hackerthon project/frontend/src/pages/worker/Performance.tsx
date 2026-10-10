import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ScoreBreakdownTable } from '../../components/CivicUI';

export default function WorkerPerformance() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/worker/performance', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) setErr('Failed to load performance data.');
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setErr('Network error.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading metrics...</div>;
  if (err || !data) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>{err || 'No data available.'}</div>;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/worker" className="btn btn-ghost text-sm">← Back</Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>My Performance Metrics</span>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="card flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Worker Score Card</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Worker: {user?.full_name} | Team: {user?.team?.name || 'General'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-[var(--black)]">
              {data.score !== null ? data.score.toFixed(1) : '—'}
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: 'var(--muted)' }}>
              {data.level || 'No Data'}
              {data.rating_stable === false && ' (Provisional)'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>Trend</div>
            <div className="text-lg font-bold mt-1 text-[var(--text)]">{data.trend || '—'}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>Verified</div>
            <div className="text-lg font-bold mt-1 text-[var(--text)]">{data.counts?.verified || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>Resolved</div>
            <div className="text-lg font-bold mt-1 text-[var(--text)]">{data.counts?.resolved || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>Ratings</div>
            <div className="text-lg font-bold mt-1 text-[var(--text)]">{data.counts?.ratings || 0}</div>
          </div>
        </div>

        {data.components && (
          <ScoreBreakdownTable components={data.components} totalScore={data.score} />
        )}
        
        {data.rating_history && data.rating_history.length > 0 && (
          <div className="card p-0 overflow-hidden mt-4">
            <div className="bg-[var(--surface-light)] px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm">6-Month Rating History</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold text-right">Avg Rating</th>
                  <th className="px-4 py-3 font-semibold text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--background)]">
                {data.rating_history.map((h: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium">{h.month}</td>
                    <td className="px-4 py-3 text-right">{h.average !== null ? h.average.toFixed(1) + ' / 5.0' : '—'}</td>
                    <td className="px-4 py-3 text-right text-[var(--muted)]">{h.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
