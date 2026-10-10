/**
 * Geospatial utilities for CivicPulse Mandsaur Localization
 * Latitude: 24.0768, Longitude: 75.0693
 * State: Madhya Pradesh, Country: India
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

/**
 * Validates coordinate ranges (-90..90, -180..180) and numbers
 */
export function validateCoordinates(latRaw: unknown, lngRaw: unknown): {
  valid: boolean;
  lat: number;
  lng: number;
  error?: string;
} {
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw));
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw));

  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, lat: 0, lng: 0, error: 'Latitude and Longitude must be valid numbers.' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, lat, lng, error: 'Latitude must be between -90 and 90 degrees.' };
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, lat, lng, error: 'Longitude must be between -180 and 180 degrees.' };
  }

  return { valid: true, lat, lng };
}

export interface ServiceAreaValidationResult {
  isWithinServiceArea: boolean;
  distanceFromCenterMeters: number;
  message?: string;
}

/**
 * Validates whether coordinates fall inside the Mandsaur CivicPulse service area.
 * Uses both polygon containment and maximum administrative radius check (~16km).
 */
export function validateMandsaurServiceArea(
  lat: number,
  lng: number
): ServiceAreaValidationResult {
  const dist = haversineDistanceMeters(
    lat,
    lng,
    MANDSAUR_CONFIG.centerLat,
    MANDSAUR_CONFIG.centerLng
  );

  const inPoly = isPointInPolygon(lat, lng, MANDSAUR_SERVICE_BOUNDARY_POLYGON);
  const withinRadius = dist <= MANDSAUR_CONFIG.serviceAreaRadiusMeters;

  // Point is considered inside if inside polygon or within urban service radius
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
