import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface MetricVal {
  value: number | null;
  numerator?: number;
  denominator?: number;
}

interface AnalyticsData {
  total_issues: MetricVal | number;
  total_complaints: MetricVal | number;
  resolution_rate: MetricVal | number;
  verified_resolution_rate: MetricVal | number;
  closure_rate: MetricVal | number;
  reopen_rate: MetricVal | number;
  assignment_rate: MetricVal | number;
  unassigned_rate: MetricVal | number;
  pending_rate: MetricVal | number;
  avg_resolution_days: MetricVal | number;
  avg_citizen_verification_hours: MetricVal | number;
  overdue_rate: MetricVal | number;
  on_time_resolution_rate: MetricVal | number;
  critical_issue_rate: MetricVal | number;
  duplicate_rate: MetricVal | number;
  grouping_efficiency: MetricVal | number;
  priority_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  categories_breakdown: { category_name: string; count: number; closure_rate: number | null }[];
  wards_breakdown: { ward_name: string; count: number; closure_rate: number | null }[];
}

function getVal(item: MetricVal | number | undefined | null, fallback = 0): number {
  if (item === undefined || item === null) return fallback;
  if (typeof item === 'number') return item;
  return item.value !== null && item.value !== undefined ? item.value : fallback;
}

function getRatio(item: MetricVal | number | undefined | null): string {
  if (typeof item === 'object' && item && item.numerator !== undefined && item.denominator !== undefined) {
    return `${item.numerator} / ${item.denominator}`;
  }
  return '';
}

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(90);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to load analytics (HTTP ${res.status})`);
      }
      const data = await res.json();
      setMetrics(data?.metrics || null);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err?.message || 'Failed to retrieve analytics data.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const priorityDist = metrics?.priority_distribution || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const totalByPriority =
    (priorityDist.LOW || 0) +
    (priorityDist.MEDIUM || 0) +
    (priorityDist.HIGH || 0) +
    (priorityDist.CRITICAL || 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Sticky Navigation */}
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="btn btn-ghost text-sm">← Back to Command Center</Link>
            <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>
              Organization Analytics & SLA Metrics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="timeframe-select" className="text-xs font-semibold text-gray-500">
              Window:
            </label>
            <select
              id="timeframe-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-white font-medium focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 6 Months</option>
              <option value={365}>Last 1 Year</option>
            </select>
            <button
              onClick={() => fetchAnalytics()}
              className="btn btn-outline text-xs px-2 py-1 ml-1"
              title="Refresh metrics from database"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        {loading ? (
          <div className="card text-center py-16" style={{ color: 'var(--muted)' }}>
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">Calculating live aggregate metrics from database…</div>
            <div className="text-xs text-gray-400 mt-1">Aggregating resolutions, SLA compliance, and ward distributions</div>
          </div>
        ) : error ? (
          <div className="card text-center py-12 border-red-200 bg-red-50 text-red-700">
            <div className="text-xl mb-1 font-bold">Error Loading Analytics</div>
            <p className="text-sm">{error}</p>
            <button onClick={() => fetchAnalytics()} className="btn btn-primary text-xs mt-4">
              Try Again
            </button>
          </div>
        ) : !metrics ? (
          <div className="card text-center py-12" style={{ color: 'var(--muted)' }}>
            No data available for the selected period.
          </div>
        ) : (
          <>
            {/* Top Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card bg-white shadow-sm border" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Total Tracked Issues
                </div>
                <div className="text-3xl font-extrabold mt-2 text-slate-800">
                  {getVal(metrics.total_issues)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  From {getVal(metrics.total_complaints)} ingested complaints
                </div>
              </div>

              <div className="card bg-white shadow-sm border" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Citizen Verified Rate
                </div>
                <div className="text-3xl font-extrabold mt-2 text-emerald-600">
                  {getVal(metrics.verified_resolution_rate)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getRatio(metrics.verified_resolution_rate)
                    ? `${getRatio(metrics.verified_resolution_rate)} decided resolutions verified`
                    : 'Verified by citizens'}
                </div>
              </div>

              <div className="card bg-white shadow-sm border" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Avg Effective Resolution
                </div>
                <div className="text-3xl font-extrabold mt-2 text-indigo-600">
                  {getVal(metrics.avg_resolution_days)} <span className="text-base font-normal">days</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Citizen verification: ~{getVal(metrics.avg_citizen_verification_hours)}h
                </div>
              </div>

              <div className="card bg-white shadow-sm border" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  On-Time SLA Compliance
                </div>
                <div className="text-3xl font-extrabold mt-2 text-teal-600">
                  {getVal(metrics.on_time_resolution_rate)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getRatio(metrics.on_time_resolution_rate)
                    ? `${getRatio(metrics.on_time_resolution_rate)} completed within SLA target`
                    : 'Target SLA met'}
                </div>
              </div>
            </div>

            {/* Pipeline & Operational Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Operational Velocity Card */}
              <div className="card bg-white shadow-sm border p-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-base mb-3 text-slate-800 flex items-center justify-between">
                  <span>Operational Pipeline & SLA Health</span>
                  <span className="text-xs font-normal text-gray-500">Live Database Calculations</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Assignment Rate (Assigned / Verified)</span>
                    <span className="font-semibold text-slate-800">
                      {getVal(metrics.assignment_rate)}%
                      {getRatio(metrics.assignment_rate) && (
                        <span className="text-xs text-gray-400 font-normal ml-1">({getRatio(metrics.assignment_rate)})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Unassigned Backlog</span>
                    <span className="font-semibold text-amber-600">
                      {getVal(metrics.unassigned_rate)}%
                      {getRatio(metrics.unassigned_rate) && (
                        <span className="text-xs text-gray-400 font-normal ml-1">({getRatio(metrics.unassigned_rate)})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Active Workflows in Progress</span>
                    <span className="font-semibold text-blue-600">
                      {getVal(metrics.pending_rate)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Citizen Reopen / Dispute Rate</span>
                    <span className={`font-semibold ${getVal(metrics.reopen_rate) > 20 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {getVal(metrics.reopen_rate)}%
                      {getRatio(metrics.reopen_rate) && (
                        <span className="text-xs text-gray-400 font-normal ml-1">({getRatio(metrics.reopen_rate)})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Duplicate Grouping Efficiency</span>
                    <span className="font-semibold text-slate-800">
                      {getVal(metrics.grouping_efficiency)}x
                      <span className="text-xs text-gray-400 font-normal ml-1">
                        ({getVal(metrics.duplicate_rate)}% duplicates deduplicated)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Active Overdue Rate</span>
                    <span className={`font-semibold ${getVal(metrics.overdue_rate) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {getVal(metrics.overdue_rate)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Distribution Card */}
              <div className="card bg-white shadow-sm border p-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-base mb-3 text-slate-800 flex items-center justify-between">
                  <span>Priority Distribution</span>
                  <span className="text-xs font-normal text-gray-500">{totalByPriority} Total</span>
                </h3>
                <div className="space-y-3">
                  {/* Visual Bar */}
                  <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    {totalByPriority > 0 ? (
                      <>
                        <div
                          style={{ width: `${((priorityDist.CRITICAL || 0) / totalByPriority) * 100}%` }}
                          className="bg-red-500 h-full transition-all"
                          title={`CRITICAL: ${priorityDist.CRITICAL}`}
                        />
                        <div
                          style={{ width: `${((priorityDist.HIGH || 0) / totalByPriority) * 100}%` }}
                          className="bg-amber-500 h-full transition-all"
                          title={`HIGH: ${priorityDist.HIGH}`}
                        />
                        <div
                          style={{ width: `${((priorityDist.MEDIUM || 0) / totalByPriority) * 100}%` }}
                          className="bg-blue-500 h-full transition-all"
                          title={`MEDIUM: ${priorityDist.MEDIUM}`}
                        />
                        <div
                          style={{ width: `${((priorityDist.LOW || 0) / totalByPriority) * 100}%` }}
                          className="bg-slate-400 h-full transition-all"
                          title={`LOW: ${priorityDist.LOW}`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-gray-200 h-full" />
                    )}
                  </div>

                  {/* Priority Breakdown Items */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        <span className="text-xs font-semibold text-red-900">CRITICAL</span>
                      </div>
                      <span className="text-base font-bold text-red-700">{priorityDist.CRITICAL || 0}</span>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-semibold text-amber-900">HIGH</span>
                      </div>
                      <span className="text-base font-bold text-amber-700">{priorityDist.HIGH || 0}</span>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-semibold text-blue-900">MEDIUM</span>
                      </div>
                      <span className="text-base font-bold text-blue-700">{priorityDist.MEDIUM || 0}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                        <span className="text-xs font-semibold text-gray-700">LOW</span>
                      </div>
                      <span className="text-base font-bold text-gray-700">{priorityDist.LOW || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Ward Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Table */}
              <div className="card bg-white shadow-sm border p-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-base mb-3 text-slate-800">
                  Category Distribution & Verification Rates
                </h3>
                {metrics.categories_breakdown && metrics.categories_breakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b text-gray-500 uppercase tracking-wider font-semibold">
                          <th className="pb-2">Category</th>
                          <th className="pb-2 text-center">Issues</th>
                          <th className="pb-2 text-right">Closure Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.categories_breakdown.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 font-medium text-slate-800">{cat.category_name}</td>
                            <td className="py-2.5 text-center font-bold text-slate-700">{cat.count}</td>
                            <td className="py-2.5 text-right">
                              {cat.closure_rate !== null ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-1.5 rounded-full"
                                      style={{ width: `${Math.min(cat.closure_rate, 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-semibold text-slate-700 w-10 text-right">
                                    {cat.closure_rate}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-4">No category records found.</div>
                )}
              </div>

              {/* Ward Breakdown Table */}
              <div className="card bg-white shadow-sm border p-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-base mb-3 text-slate-800">
                  Ward Hotspot Distribution & Resolution
                </h3>
                {metrics.wards_breakdown && metrics.wards_breakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b text-gray-500 uppercase tracking-wider font-semibold">
                          <th className="pb-2">Ward / Zone</th>
                          <th className="pb-2 text-center">Issues</th>
                          <th className="pb-2 text-right">Verified Closure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {metrics.wards_breakdown.map((ward, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 font-medium text-slate-800">{ward.ward_name}</td>
                            <td className="py-2.5 text-center font-bold text-slate-700">{ward.count}</td>
                            <td className="py-2.5 text-right">
                              {ward.closure_rate !== null ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-teal-500 h-1.5 rounded-full"
                                      style={{ width: `${Math.min(ward.closure_rate, 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-semibold text-slate-700 w-10 text-right">
                                    {ward.closure_rate}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-4">No ward records found.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
