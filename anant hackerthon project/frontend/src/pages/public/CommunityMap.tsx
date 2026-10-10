import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, useMap } from 'react-leaflet';
import {
  MANDSAUR_DEFAULT_CENTER,
  MANDSAUR_CONFIG,
  MANDSAUR_SERVICE_BOUNDARY_POLYGON,
} from '../../lib/geo';

interface HotspotItem {
  ward_id: string;
  ward_name: string;
  lat: number;
  lng: number;
  issue_count: number;
  report_count: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  top_category_name: string | null;
}

const levelColor = { LOW: '#a0a09f', MEDIUM: '#555', HIGH: '#000' };
const levelRadius = { LOW: 10, MEDIUM: 16, HIGH: 22 };

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function CommunityMap() {
  const [items, setItems] = useState<HotspotItem[]>([]);
  const [insight, setInsight] = useState<string[]>([]);
  const [days, setDays] = useState(90);
  const [center, setCenter] = useState<[number, number]>(MANDSAUR_DEFAULT_CENTER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/public/hotspots?days=${days}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          const itms = Array.isArray(d.items) ? d.items : [];
          const ins = Array.isArray(d.insight) ? d.insight : [];
          setItems(itms);
          setInsight(ins);
          // Only recenter if items are within Mandsaur
          if (itms.length > 0 && itms[0].lat && itms[0].lng) {
            setCenter([itms[0].lat, itms[0].lng]);
          } else {
            setCenter(MANDSAUR_DEFAULT_CENTER);
          }
        }
        setLoaded(true);
      })
      .catch(() => {
        setCenter(MANDSAUR_DEFAULT_CENTER);
        setLoaded(true);
      });
  }, [days]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Nav */}
      <nav className="border-b" style={{ borderColor: 'var(--border)', background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg" style={{ color: 'var(--text)' }}>
            CivicPulse
          </Link>
          <div className="flex gap-3">
            <Link to="/login" className="btn btn-outline text-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary text-sm">
              Report Issue
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>
                Community Civic Map
              </h1>
              <span className="badge badge-low text-xs">Mandsaur, MP</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Aggregated view of civic issues across Mandsaur wards. No personal citizen data is shown.
            </p>
          </div>
          <select
            className="input"
            style={{ width: 160 }}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
        </div>

        {/* Insight */}
        {insight.map((msg, i) => (
          <div
            key={i}
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'var(--section-gray)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            💡 {msg}
          </div>
        ))}

        {/* Map */}
        <div
          className="rounded-2xl overflow-hidden border mb-8 relative"
          style={{ height: 480, borderColor: 'var(--border)' }}
        >
          {loaded && (
            <MapContainer
              center={center}
              zoom={MANDSAUR_CONFIG.defaultZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <MapController center={center} zoom={MANDSAUR_CONFIG.defaultZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Mandsaur Civic Service Area Boundary */}
              <Polygon
                positions={MANDSAUR_SERVICE_BOUNDARY_POLYGON}
                pathOptions={{
                  color: '#444',
                  weight: 1.5,
                  dashArray: '4, 4',
                  fillColor: '#888',
                  fillOpacity: 0.05,
                }}
              >
                <Tooltip sticky>
                  <strong>Mandsaur CivicPulse Service Area</strong>
                  <br />
                  Madhya Pradesh, India
                </Tooltip>
              </Polygon>

              {items.map(item => (
                <CircleMarker
                  key={item.ward_id}
                  center={[item.lat, item.lng]}
                  radius={levelRadius[item.level]}
                  pathOptions={{
                    color: levelColor[item.level],
                    fillColor: levelColor[item.level],
                    fillOpacity: 0.5,
                    weight: 1.5,
                  }}
                >
                  <Tooltip>
                    <strong>{item.ward_name}</strong>
                    <br />
                    {item.issue_count} issues • {item.report_count} reports
                    <br />
                    {item.top_category_name && `Top: ${item.top_category_name}`}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Legend + Ward list */}
        <div className="flex gap-6 items-center mb-6 flex-wrap">
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map(lvl => (
            <div key={lvl} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: levelColor[lvl],
                }}
              />
              {lvl} Priority Hotspot
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm ml-auto" style={{ color: 'var(--muted)' }}>
            <span style={{ borderBottom: '2px dashed #666', width: 20, display: 'inline-block' }} />
            Mandsaur Service Boundary
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card text-center" style={{ color: 'var(--muted)' }}>
            No civic issues reported in this time period in Mandsaur.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div
                key={item.ward_id}
                className="card flex flex-col gap-2 cursor-pointer hover:border-black transition-colors"
                onClick={() => setCenter([item.lat, item.lng])}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {item.ward_name}
                  </span>
                  <span className="badge">{item.level}</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  {item.issue_count} issues · {item.report_count} reports
                </div>
                {item.top_category_name && (
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    Top: {item.top_category_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
