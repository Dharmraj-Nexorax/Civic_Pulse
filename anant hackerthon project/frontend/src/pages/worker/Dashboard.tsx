import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>CivicPulse · Worker</span>
          <div className="flex items-center gap-3">
            <button onClick={async () => { await logout(); navigate('/'); }} className="btn btn-outline text-sm">Sign Out</button>
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Worker Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Logged in as {user?.full_name} {user?.team?.name ? `(${user.team.name})` : ''}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/worker/issues" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">🔧</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>My Assigned Tasks</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>View tasks assigned to you and update resolution status.</div>
          </Link>
          <Link to="/worker/performance" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">📊</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>My Performance</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Check your personal SLA compliance and verification rates.</div>
          </Link>
          <Link to="/community-map" className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
            <div className="text-2xl">🗺️</div>
            <div className="font-semibold" style={{ color: 'var(--text)' }}>Civic Map</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Overview of community ward hotspots.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
