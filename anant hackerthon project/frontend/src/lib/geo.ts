/**
 * Geospatial utilities, configuration, and reverse geocoding for CivicPulse Mandsaur
 * Latitude: 24.0768, Longitude: 75.0693
 * State: Madhya Pradesh, India
 */

export const MANDSAUR_CONFIG = {
  centerLat: 24.0768,
  centerLng: 75.0693,
  defaultZoom: 13,
  cityName: 'Mandsaur',
  district: 'Mandsaur',
  state: 'Madhya Pradesh',
  country: 'India',
  serviceAreaRadiusMeters: 16000, // 16 km covering municipal and urban civic zones
  postalCodePrefix: '458',
} as const;

export const MANDSAUR_DEFAULT_CENTER: [number, number] = [
  MANDSAUR_CONFIG.centerLat,
  MANDSAUR_CONFIG.centerLng,
];

/**
 * Service Area Boundary Polygon for Mandsaur, Madhya Pradesh
 * Enclosing Mandsaur Nagar Palika, Old City, Nai Abadi, Sanjit Naka, Sitamau Road,
 * Industrial Area, Shivna River banks, and urban contiguous wards.
 * Order: [latitude, longitude] tuples.
 */
export const MANDSAUR_SERVICE_BOUNDARY_POLYGON: [number, number][] = [
  [24.1800, 75.0500],
  [24.1600, 75.1400],
  [24.1100, 75.1700],
  [24.0300, 75.1600],
  [23.9700, 75.1100],
  [23.9700, 75.0200],
  [24.0300, 74.9700],
  [24.1100, 74.9700],
  [24.1600, 75.0000],
];

/**
 * Haversine formula calculation in pure TypeScript (meters)
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Ray-casting algorithm to test whether a coordinate pair lies inside a polygon
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface ServiceAreaValidationResult {
  isWithinServiceArea: boolean;
  distanceFromCenterMeters: number;
  message?: string;
}

/**
 * Validates whether coordinates fall inside the Mandsaur CivicPulse service area.
 * Returns true if inside the boundary polygon or within the 16 km administrative radius.
 */
export function validateMandsaurServiceArea(
  lat: number,
  lng: number
): ServiceAreaValidationResult {
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      isWithinServiceArea: false,
      distanceFromCenterMeters: 0,
      message: 'Invalid latitude or longitude coordinates.',
    };
  }

  const dist = haversineDistanceMeters(
    lat,
    lng,
    MANDSAUR_CONFIG.centerLat,
    MANDSAUR_CONFIG.centerLng
  );

  const inPoly = isPointInPolygon(lat, lng, MANDSAUR_SERVICE_BOUNDARY_POLYGON);
  const withinRadius = dist <= MANDSAUR_CONFIG.serviceAreaRadiusMeters;

  const isWithin = inPoly || withinRadius;

  if (!isWithin) {
    return {
      isWithinServiceArea: false,
      distanceFromCenterMeters: dist,
      message:
        'Your selected location is outside the currently supported CivicPulse service area. Please select a location within Mandsaur, Madhya Pradesh.',
    };
  }

  return {
    isWithinServiceArea: true,
    distanceFromCenterMeters: dist,
  };
}

export interface GeocodedAddress {
  formattedAddress: string;
  road?: string;
  locality?: string;
  ward?: string;
  city: string;
  district: string;
  state: string;
  country: string;
  postalCode?: string;
}

// In-memory cache for reverse geocoding to prevent redundant network requests and throttling
const geocodeCache = new Map<string, GeocodedAddress>();

/**
 * Reverse geocode coordinates to a structured address using OpenStreetMap Nominatim.
 * Throttled, cached, and gracefully handles network/rate-limiting failures.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedAddress> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      throw new Error(`Geocoding HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    const road = addr.road || addr.pedestrian || addr.path || addr.street || '';
    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.hamlet ||
      addr.village ||
      addr.subdistrict ||
      '';
    const ward = addr.city_district || addr.ward || '';
    const city = addr.city || addr.town || addr.municipality || MANDSAUR_CONFIG.cityName;
    const district = addr.county || addr.state_district || MANDSAUR_CONFIG.district;
    const state = addr.state || MANDSAUR_CONFIG.state;
    const country = addr.country || MANDSAUR_CONFIG.country;
    const postalCode = addr.postcode || '';

    // Construct a clean, human-readable address line
    const parts = [road, locality, ward, city, postalCode].filter(Boolean);
    const formattedAddress =
      parts.length > 0 ? parts.join(', ') : `${city}, ${state}`;

    const result: GeocodedAddress = {
      formattedAddress,
      road: road || undefined,
      locality: locality || undefined,
      ward: ward || undefined,
      city,
      district,
      state,
      country,
      postalCode: postalCode || undefined,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch {
    // Graceful offline fallback
    const fallback: GeocodedAddress = {
      formattedAddress: `Mandsaur (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: MANDSAUR_CONFIG.cityName,
      district: MANDSAUR_CONFIG.district,
      state: MANDSAUR_CONFIG.state,
      country: MANDSAUR_CONFIG.country,
    };
    return fallback;
  }
}

/**
 * Get current browser GPS location with high accuracy, reasonable timeout, and descriptive errors
 */
export function getCurrentBrowserPosition(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = 'Unable to determine your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg =
            'Location permission denied. Please allow location access or pick your location manually on the map.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg =
            'Location information is unavailable. Please select your location manually on the map.';
        } else if (err.code === err.TIMEOUT) {
          msg =
            'Location request timed out. Please try again or select your location manually on the map.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
