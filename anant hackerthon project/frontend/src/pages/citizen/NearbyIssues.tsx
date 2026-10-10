import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MANDSAUR_DEFAULT_CENTER,
  validateMandsaurServiceArea,
  getCurrentBrowserPosition,
} from '../../lib/geo';

interface NearbyIssue {
  issue_id: string;
  category_name: string;
  status: string;
  status_label: string;
  distance_m: number;
  ward_name: string;
}

export default function NearbyIssues() {
  const [items, setItems] = useState<NearbyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoNote, setInfoNote] = useState('');
  const [coordsUsed, setCoordsUsed] = useState<[number, number]>(MANDSAUR_DEFAULT_CENTER);

  const fetchIssuesAt = (lat: number, lng: number, note?: string) => {
    setCoordsUsed([lat, lng]);
    if (note) setInfoNote(note);
    fetch(`/api/citizen/issues/nearby?lat=${lat}&lng=${lng}&radius=10000`, {
      credentials: 'include',
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setItems(Array.isArray(d?.issues) ? d.issues : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getCurrentBrowserPosition()
      .then(pos => {
        const areaCheck = validateMandsaurServiceArea(pos.lat, pos.lng);
        if (areaCheck.isWithinServiceArea) {
          fetchIssuesAt(pos.lat, pos.lng);
        } else {
          fetchIssuesAt(
            MANDSAUR_DEFAULT_CENTER[0],
            MANDSAUR_DEFAULT_CENTER[1],
            'Your device is outside Mandsaur. Displaying civic issues centered around Mandsaur city center.'
          );
        }
      })
      .catch(() => {
        // Fall back gracefully to Mandsaur center without crashing
        fetchIssuesAt(
          MANDSAUR_DEFAULT_CENTER[0],
          MANDSAUR_DEFAULT_CENTER[1],
          'Location access unavailable. Showing issues around Mandsaur city center.'
        );
      });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/citizen" className="btn btn-ghost text-sm">
              ← Back
            </Link>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>
              Nearby Civic Issues
            </span>
          </div>
          <span className="badge text-xs">Mandsaur, MP</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {infoNote && (
          <div
            className="mb-4 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
            style={{
              background: 'var(--section-gray)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <span>ℹ️</span> {infoNote}
          </div>
        )}

        {loading && (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>
            Detecting location and fetching nearby Mandsaur issues…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="card text-center py-10" style={{ color: 'var(--muted)' }}>
            No unresolved civic issues reported near this location in Mandsaur.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.issue_id} className="card flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {item.category_name} — {item.ward_name}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {item.distance_m < 1000
                    ? `${Math.round(item.distance_m)}m away`
                    : `${(item.distance_m / 1000).toFixed(1)} km away`}
                </div>
              </div>
              <span className="status-pill">{item.status_label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
