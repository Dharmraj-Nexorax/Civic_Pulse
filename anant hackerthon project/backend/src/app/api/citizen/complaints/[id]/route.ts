import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCitizenIssueView } from '@/services/issueService';
import { errorResponse, okResponse } from '@/lib/http';
import { notFound } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const { rows: compRows } = await query(
      `SELECT id, citizen_id FROM complaints WHERE id = $1 AND organization_id = $2`,
      [params.id, user.organization_id]
    );

    if (compRows.length === 0) {
      throw notFound('Complaint not found.');
    }

    const { citizen_id } = compRows[0];
    const view = await getCitizenIssueView(params.id, citizen_id);
    return okResponse(view);
  } catch (error) {
    return errorResponse(error);
  }
}
