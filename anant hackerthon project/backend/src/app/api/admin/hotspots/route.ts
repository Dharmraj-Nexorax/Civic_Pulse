import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { computeWardHotspots } from '@/domain/hotspots';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows } = await query(
      `SELECT w.id as ward_id, w.name as ward_name, w.center_lat, w.center_lng,
              COUNT(DISTINCT i.id) as issue_count,
              COUNT(c.id) as report_count
       FROM wards w
       LEFT JOIN issues i ON i.ward_id = w.id AND i.organization_id = $1 AND i.status NOT IN ('CITIZEN_VERIFIED', 'DUPLICATE')
       LEFT JOIN complaints c ON c.issue_id = i.id
       WHERE w.organization_id = $1
       GROUP BY w.id, w.name, w.center_lat, w.center_lng`,
      [user.organization_id]
    );

    const inputs = rows.map(r => ({
      ward_id: r.ward_id,
      ward_name: r.ward_name,
      lat: r.center_lat || 0,
      lng: r.center_lng || 0,
      issue_count: parseInt(r.issue_count, 10) || 0,
      report_count: parseInt(r.report_count, 10) || 0,
      top_category_name: null,
    }));

    const result = computeWardHotspots(inputs);

    return okResponse({ hotspots: result.adminItems, insight: result.insight });
  } catch (error) {
    return errorResponse(error);
  }
}
