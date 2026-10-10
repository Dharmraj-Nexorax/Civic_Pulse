import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import LocationPickerMap, { LocationSelection } from '../../components/LocationPickerMap';
import { MANDSAUR_DEFAULT_CENTER } from '../../lib/geo';

interface Category {
  id: string;
  key: string;
  name: string;
}
interface Ward {
  id: string;
  name: string;
}

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState({
    description: '',
    category_id: '',
    ward_id: user?.ward?.id || '',
    lat: String(MANDSAUR_DEFAULT_CENTER[0]),
    lng: String(MANDSAUR_DEFAULT_CENTER[1]),
  });
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/public/categories')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
    fetch('/api/public/wards')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setWards(Array.isArray(d) ? d : []))
      .catch(() => setWards([]));
  }, []);

  const handleLocationChange = (loc: LocationSelection) => {
    setSelectedLocation(loc);
    setForm(f => ({
      ...f,
      lat: String(loc.lat),
      lng: String(loc.lng),
    }));

    if (!loc.validation.isWithinServiceArea) {
      setError(
        'Your selected location is outside the currently supported CivicPulse service area. Please select a location within Mandsaur.'
      );
    } else {
      setError('');
    }
  };

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.lat || !form.lng) {
      setError('Please select an issue location on the map.');
      return;
    }

    if (selectedLocation && !selectedLocation.validation.isWithinServiceArea) {
      setError(
        'Your selected location is outside the currently supported CivicPulse service area. Please select a location within Mandsaur.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('description', form.description);
      fd.append('category_id', form.category_id);
      fd.append('ward_id', form.ward_id);
      fd.append('lat', form.lat);
      fd.append('lng', form.lng);

      if (selectedLocation) {
        if (selectedLocation.address.formattedAddress) {
          fd.append('address', selectedLocation.address.formattedAddress);
        }
        if (selectedLocation.address.city) {
          fd.append('city', selectedLocation.address.city);
        }
        if (selectedLocation.address.district) {
          fd.append('district', selectedLocation.address.district);
        }
        if (selectedLocation.address.state) {
          fd.append('state', selectedLocation.address.state);
        }
        if (selectedLocation.address.country) {
          fd.append('country', selectedLocation.address.country);
        }
        if (selectedLocation.address.postalCode) {
          fd.append('postal_code', selectedLocation.address.postalCode);
        }
        fd.append('location_method', selectedLocation.method);
      }

      if (files) {
        for (let i = 0; i < Math.min(files.length, 5); i++) {
          fd.append('media', files[i]);
        }
      }

      const res = await fetch('/api/citizen/complaints', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Submission failed.');
        return;
      }
      navigate(`/citizen/complaints/${data.complaint_id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <nav className="border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to="/citizen" className="btn btn-ghost text-sm">
            ← Back
          </Link>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            Report a Civic Issue (Mandsaur)
          </span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={set('category_id')} required>
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Ward</label>
              <select className="input" value={form.ward_id} onChange={set('ward_id')} required>
                <option value="">Select ward…</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Describe the Issue</label>
              <textarea
                className="input"
                style={{ minHeight: 110, resize: 'vertical' }}
                placeholder="Describe what is wrong, exact location landmarks, and urgency…"
                value={form.description}
                onChange={set('description')}
                required
                minLength={10}
              />
            </div>

            {/* Interactive Location Picker Map */}
            <div>
              <label className="label">Issue Location (Mandsaur Service Area)</label>
              <LocationPickerMap
                initialLat={parseFloat(form.lat) || MANDSAUR_DEFAULT_CENTER[0]}
                initialLng={parseFloat(form.lng) || MANDSAUR_DEFAULT_CENTER[1]}
                onLocationChange={handleLocationChange}
              />
            </div>

            <div>
              <label className="label">Photo / Video Evidence (optional, up to 5 files)</label>
              <input
                className="input"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                multiple
                onChange={e => setFiles(e.target.files)}
              />
            </div>

            {error && (
              <div
                className="text-sm px-3.5 py-2.5 rounded-lg border"
                style={{
                  background: '#fef7e0',
                  color: '#7a4f01',
                  borderColor: '#f9ab00',
                }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || (selectedLocation ? !selectedLocation.validation.isWithinServiceArea : false)}
              >
                {submitting ? 'Submitting…' : 'Submit Complaint'}
              </button>
              <Link to="/citizen" className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
