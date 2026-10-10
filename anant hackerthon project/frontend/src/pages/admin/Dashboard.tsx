import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>CivicPulse · Admin Portal</span>
          <div className="flex items-center gap-3">
            <button onClick={async () => { await logout(); navigate('/'); }} className="btn btn-outline text-sm">Sign Out</button>
          </div>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Administrator Command Center</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Welcome, {user?.full_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/issues" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">📋</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Issue Management</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Triage, assign workers, override priority, and track SLA.</div>
          </Link>
          <Link to="/admin/intelligence" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">🚨</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Intelligence & Alerts</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Automated surge detection, bottleneck alerts, and hotspot clusters.</div>
          </Link>
          <Link to="/admin/analytics" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">📈</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Analytics & Metrics</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Organization KPIs, resolution times, and team performance.</div>
          </Link>
          <Link to="/admin/workers" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">👷</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Worker Directory</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Create workers, assign teams, and view individual metrics.</div>
          </Link>
          <Link to="/admin/teams" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">👥</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Teams & Departments</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Manage departmental units and department leads.</div>
          </Link>
          <Link to="/community-map" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">🗺️</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Community Map</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>View public geographic heatmap of issues.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
