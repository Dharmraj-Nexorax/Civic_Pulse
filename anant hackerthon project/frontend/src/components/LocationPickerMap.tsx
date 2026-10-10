import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MANDSAUR_CONFIG,
  MANDSAUR_DEFAULT_CENTER,
  MANDSAUR_SERVICE_BOUNDARY_POLYGON,
  validateMandsaurServiceArea,
  reverseGeocode,
  getCurrentBrowserPosition,
  GeocodedAddress,
  ServiceAreaValidationResult,
} from '../lib/geo';

// Crisp, modern SVG Civic Marker Icon (no external asset dependencies)
export const civicPinIcon = L.divIcon({
  className: 'civic-pulse-pin',
  html: `
    <div style="position: relative; width: 36px; height: 42px; transform: translate(-18px, -42px); cursor: grab;">
      <svg viewBox="0 0 24 28" width="36" height="42" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 16 12 16s12-7.5 12-16c0-6.63-5.37-12-12-12z" fill="#000000" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
        <circle cx="12" cy="11" r="2" fill="#000000" />
      </svg>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
});

export interface LocationSelection {
  lat: number;
  lng: number;
  address: GeocodedAddress;
  method: 'GPS' | 'MANUAL';
  validation: ServiceAreaValidationResult;
}

interface LocationPickerMapProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationChange: (loc: LocationSelection) => void;
}

function MapEventsHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFlyController({
  target,
  zoom,
}: {
  target: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, zoom || 15, { duration: 0.8 });
    }
  }, [target, zoom, map]);
  return null;
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onLocationChange,
}: LocationPickerMapProps) {
  // Coordinates state - default strictly to Mandsaur city center
  const [coords, setCoords] = useState<[number, number]>(() => {
    if (
      typeof initialLat === 'number' &&
      !isNaN(initialLat) &&
      typeof initialLng === 'number' &&
      !isNaN(initialLng)
    ) {
      return [initialLat, initialLng];
    }
    return MANDSAUR_DEFAULT_CENTER;
  });

  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [method, setMethod] = useState<'GPS' | 'MANUAL'>('MANUAL');
  const [locating, setLocating] = useState(false);
  const [locatingMsg, setLocatingMsg] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isManualSelectionMade, setIsManualSelectionMade] = useState(false);

  // Debounce ref for reverse geocoding
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Service area validation for current coordinates
  const validation = useMemo(
    () => validateMandsaurServiceArea(coords[0], coords[1]),
    [coords]
  );

  // Perform reverse geocoding whenever coordinates change
  useEffect(() => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
    }

    setGeocoding(true);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const addr = await reverseGeocode(coords[0], coords[1]);
        setAddress(addr);
        onLocationChange({
          lat: coords[0],
          lng: coords[1],
          address: addr,
          method,
          validation,
        });
      } finally {
        setGeocoding(false);
      }
    }, 300);

    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, [coords[0], coords[1], method]);

  // Handle marker drag
  const handleMarkerDragEnd = (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    setCoords([position.lat, position.lng]);
    setMethod('MANUAL');
    setIsManualSelectionMade(true);
    setLocatingMsg(null);
  };

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    setCoords([lat, lng]);
    setMethod('MANUAL');
    setIsManualSelectionMade(true);
    setLocatingMsg(null);
  };

  // Browser Geolocation ("Use My Current Location")
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setLocatingMsg('Detecting GPS location…');

    try {
      const pos = await getCurrentBrowserPosition();
      const detectedLat = pos.lat;
      const detectedLng = pos.lng;

      // Update coordinates to user's real location
      setCoords([detectedLat, detectedLng]);
      setMethod('GPS');
      setFlyTarget([detectedLat, detectedLng]);

      const areaCheck = validateMandsaurServiceArea(detectedLat, detectedLng);
      if (areaCheck.isWithinServiceArea) {
        setLocatingMsg('✓ GPS location detected within Mandsaur service area.');
      } else {
        setLocatingMsg(
          '⚠ Detected location is outside the Mandsaur service area (~' +
            Math.round(areaCheck.distanceFromCenterMeters / 1000) +
            ' km away). CivicPulse is currently active only in Mandsaur, MP. Please drag or click to place your pin in Mandsaur.'
        );
      }
    } catch (err: any) {
      setLocatingMsg(err.message || 'Could not acquire GPS position.');
    } finally {
      setLocating(false);
    }
  };

  // Reset to Mandsaur center
  const handleResetToMandsaurCenter = () => {
    setCoords(MANDSAUR_DEFAULT_CENTER);
    setFlyTarget(MANDSAUR_DEFAULT_CENTER);
    setMethod('MANUAL');
    setLocatingMsg(null);
    setIsManualSelectionMade(true);
  };

  // Quick landmark search in Mandsaur
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const query = `${searchQuery.trim()} Mandsaur Madhya Pradesh`;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query
      )}&viewbox=74.96,24.19,75.18,23.96&bounded=0&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setCoords([lat, lon]);
      setFlyTarget([lat, lon]);
      setMethod('MANUAL');
      setIsManualSelectionMade(true);
      setSearchResults([]);
      setSearchQuery(item.display_name.split(',')[0]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline text-xs flex items-center gap-1.5"
            onClick={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? '📡 Locating…' : '📍 Use My Current Location'}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={handleResetToMandsaurCenter}
            title="Recenter map to Mandsaur city center"
          >
            🎯 Mandsaur Center
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {validation.isWithinServiceArea ? (
            <span
              className="badge text-xs"
              style={{
                background: '#e6f4ea',
                color: '#137333',
                borderColor: '#ceead6',
              }}
            >
              ✓ Inside Mandsaur Service Area
            </span>
          ) : (
            <span
              className="badge text-xs"
              style={{
                background: '#fce8e6',
                color: '#c5221f',
                borderColor: '#fad2cf',
              }}
            >
              ⚠ Outside Supported Service Area
            </span>
          )}
        </div>
      </div>

      {/* Optional Search */}
      <form onSubmit={handleSearch} className="flex gap-2 relative">
        <input
          type="text"
          className="input text-xs"
          placeholder="Search landmark in Mandsaur (e.g. Nai Abadi, Pashupatinath, Station Road)…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-outline text-xs whitespace-nowrap"
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>

        {searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            {searchResults.map((r, i) => (
              <div
                key={i}
                className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                onClick={() => handleSelectSearchResult(r)}
              >
                {r.display_name}
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Service Warning Notification if outside Mandsaur */}
      {!validation.isWithinServiceArea && (
        <div
          className="p-3 rounded-xl text-xs flex items-start gap-2"
          style={{
            background: '#fef7e0',
            border: '1px solid #f9ab00',
            color: '#7a4f01',
          }}
        >
          <span className="text-base leading-none">⚠️</span>
          <div>
            <strong>Outside CivicPulse Service Area:</strong>{' '}
            Your selected pin is located outside Mandsaur, Madhya Pradesh. Civic complaints can only be filed within Mandsaur.
            Please click on the map or drag the pin inside the dashed Mandsaur boundary.
          </div>
        </div>
      )}

      {locatingMsg && (
        <div
          className="p-2.5 rounded-lg text-xs"
          style={{
            background: locatingMsg.startsWith('✓') ? '#e6f4ea' : '#fef7e0',
            color: locatingMsg.startsWith('✓') ? '#137333' : '#7a4f01',
            border: '1px solid var(--border)',
          }}
        >
          {locatingMsg}
        </div>
      )}

      {/* Map Canvas */}
      <div
        className="rounded-xl overflow-hidden border relative"
        style={{ height: 320, borderColor: 'var(--border)' }}
      >
        <MapContainer
          center={MANDSAUR_DEFAULT_CENTER}
          zoom={MANDSAUR_CONFIG.defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <MapFlyController target={flyTarget} />
          <MapEventsHandler onMapClick={handleMapClick} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Mandsaur Civic Service Area Boundary Polygon */}
          <Polygon
            positions={MANDSAUR_SERVICE_BOUNDARY_POLYGON}
            pathOptions={{
              color: '#333333',
              weight: 1.5,
              dashArray: '5, 5',
              fillColor: '#000000',
              fillOpacity: 0.04,
            }}
          />

          {/* Draggable complaint pin */}
          <Marker
            position={coords}
            draggable
            icon={civicPinIcon}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          />
        </MapContainer>

        {/* Map instruction overlay */}
        <div
          className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] border pointer-events-none z-[1000]"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          💡 Click or drag marker to pinpoint exact issue location
        </div>
      </div>

      {/* Location Details Card */}
      <div
        className="card p-3 flex flex-col gap-1.5 text-xs"
        style={{ background: 'var(--section-gray)' }}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            Selected Location Details
          </span>
          <span className="badge text-[10px]">
            {method === 'GPS' ? '📡 GPS Detected' : '📌 Map Selected'}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-muted" style={{ minWidth: 64 }}>
            Address:
          </span>
          <span className="font-medium flex-1" style={{ color: 'var(--text)' }}>
            {geocoding ? (
              <span className="animate-pulse">Resolving address…</span>
            ) : address ? (
              address.formattedAddress
            ) : (
              'Locating…'
            )}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--muted)' }}>
          <span>
            Lat: <strong>{coords[0].toFixed(5)}</strong>
          </span>
          <span>
            Lng: <strong>{coords[1].toFixed(5)}</strong>
          </span>
          <span>
            City: <strong>{address?.city || 'Mandsaur'}</strong>
          </span>
          <span>
            State: <strong>{address?.state || 'Madhya Pradesh'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
