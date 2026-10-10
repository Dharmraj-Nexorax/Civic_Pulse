import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>CivicPulse</span>
          <div className="flex items-center gap-3">
            <Link to="/citizen/notifications" className="btn btn-ghost text-sm">Notifications</Link>
            <button onClick={handleLogout} className="btn btn-outline text-sm">Sign Out</button>
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            Welcome, {user?.full_name}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Ward: {user?.ward?.name || '—'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {[
            { to: '/citizen/report', title: 'Report Issue', desc: 'Submit a new civic complaint in your area.', icon: '📋' },
            { to: '/citizen/complaints', title: 'My Complaints', desc: 'Track the status of all your reports.', icon: '🗂️' },
            { to: '/citizen/nearby', title: 'Nearby Issues', desc: 'See reported issues around you.', icon: '🗺️' },
            { to: '/community-map', title: 'Community Map', desc: 'Public hotspot view of your area.', icon: '🌐' },
            { to: '/citizen/notifications', title: 'Notifications', desc: 'Updates on your complaints.', icon: '🔔' },
          ].map(item => (
            <Link key={item.to} to={item.to} className="card hover:shadow-md transition-shadow flex flex-col gap-2" style={{ textDecoration: 'none' }}>
              <div className="text-2xl">{item.icon}</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{item.title}</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
