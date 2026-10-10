import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [config.defaultOrgSlug]
    );

    if (orgRows.length === 0) {
      return okResponse([]);
    }

    const { rows: wards } = await query<{ id: string; name: string }>(
      'SELECT id, name FROM wards WHERE organization_id = $1 ORDER BY name ASC',
      [orgRows[0].id]
    );

    return okResponse(wards);
  } catch (error) {
    return errorResponse(error);
  }
}
