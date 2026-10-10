import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { haversineDistanceMeters, MANDSAUR_CONFIG } from '@/lib/geo';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const { searchParams } = new URL(req.url);
    let lat = parseFloat(searchParams.get('lat') || '');
    let lng = parseFloat(searchParams.get('lng') || '');
    const radiusMeters = parseFloat(searchParams.get('radius') || '5000');

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      lat = MANDSAUR_CONFIG.centerLat;
      lng = MANDSAUR_CONFIG.centerLng;
    }

    const { rows } = await query(
      `SELECT i.id as issue_id, i.lat, i.lng, i.status, cat.name as category_name, w.name as ward_name
       FROM issues i
       JOIN categories cat ON cat.id = i.category_id
       JOIN wards w ON w.id = i.ward_id
       WHERE i.organization_id = $1 AND i.status <> 'CITIZEN_VERIFIED' AND i.merged_into_issue_id IS NULL`,
      [user.organization_id]
    );

    const issues = rows
      .map(r => {
        const dist = haversineDistanceMeters(lat, lng, r.lat, r.lng);
        return {
          issue_id: r.issue_id,
          category_name: r.category_name,
          ward_name: r.ward_name,
          status: r.status,
          status_label: r.status.replace(/_/g, ' '),
          distance_m: dist,
        };
      })
      .filter(r => r.distance_m <= radiusMeters)
      .sort((a, b) => a.distance_m - b.distance_m);

    return okResponse({ issues });
  } catch (error) {
    return errorResponse(error);
  }
}
