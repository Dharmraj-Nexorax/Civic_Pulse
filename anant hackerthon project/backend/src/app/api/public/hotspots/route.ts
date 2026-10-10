import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { computeHotspots } from '@/domain/hotspots';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [config.defaultOrgSlug]
    );

    if (orgRows.length === 0) {
      return okResponse({ days: 90, items: [], insight: ['No data available.'] });
    }
    const orgId = orgRows[0].id;

    const daysParam = parseInt(req.nextUrl.searchParams.get('days') || '90', 10);
    const days = isNaN(daysParam) ? 90 : daysParam;
    const categoryKey = req.nextUrl.searchParams.get('category_key');

    let categoryFilter = '';
    const params: any[] = [orgId, days];
    if (categoryKey) {
      params.push(categoryKey);
      categoryFilter = 'AND cat.key = $3';
    }

    const { rows: wardStats } = await query<{
      ward_id: string;
      ward_name: string;
      center_lat: number;
      center_lng: number;
      issue_count: string | number;
      report_count: string | number;
      top_category_name: string | null;
    }>(
      `SELECT w.id as ward_id, w.name as ward_name, w.center_lat, w.center_lng,
              COUNT(DISTINCT i.id) as issue_count,
              COUNT(c.id) as report_count,
              (
                SELECT cat2.name
                FROM issues i2
                JOIN categories cat2 ON cat2.id = i2.category_id
                WHERE i2.ward_id = w.id
                  AND i2.organization_id = $1
                  AND i2.merged_into_issue_id IS NULL
                  AND i2.created_at >= DATE_SUB(NOW(), INTERVAL $2 DAY)
                GROUP BY cat2.id, cat2.name
                ORDER BY COUNT(*) DESC
                LIMIT 1
              ) as top_category_name
       FROM wards w
       LEFT JOIN issues i ON i.ward_id = w.id
                         AND i.organization_id = $1
                         AND i.merged_into_issue_id IS NULL
                         AND i.created_at >= DATE_SUB(NOW(), INTERVAL $2 DAY)
       LEFT JOIN categories cat ON cat.id = i.category_id ${categoryFilter}
       LEFT JOIN complaints c ON c.issue_id = i.id
       WHERE w.organization_id = $1
       GROUP BY w.id, w.name, w.center_lat, w.center_lng`,
      params
    );

    const aggregates = wardStats.map((w) => ({
      ward_id: w.ward_id,
      ward_name: w.ward_name,
      lat: w.center_lat,
      lng: w.center_lng,
      issue_count: parseInt(String(w.issue_count), 10),
      report_count: parseInt(String(w.report_count), 10),
      top_category_name: w.top_category_name,
    }));

    const result = computeHotspots(aggregates, days);

    return okResponse({
      days,
      items: result.publicItems,
      insight: result.insight,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
