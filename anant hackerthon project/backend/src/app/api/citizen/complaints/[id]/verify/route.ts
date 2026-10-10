import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { verifyResolution } from '@/services/resolutionService';
import { errorResponse, okResponse } from '@/lib/http';
import { notFound, validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const body = await req.json();
    const { decision, reject_reason, stars } = body;

    if (decision !== 'VERIFIED' && decision !== 'REJECTED') {
      throw validationError('Decision must be VERIFIED or REJECTED');
    }

    const { rows: compRows } = await query(
      `SELECT issue_id FROM complaints WHERE id = $1 AND organization_id = $2`,
      [params.id, user.organization_id]
    );

    if (compRows.length === 0) {
      throw notFound('Complaint not found.');
    }

    const issueId = compRows[0].issue_id;

    const result = await withTransaction(async (client) => {
      return await verifyResolution(client, {
        issueId,
        complaintId: params.id,
        citizenId: user.id,
        decision,
        rejectReason: reject_reason,
        stars: typeof stars === 'number' ? stars : undefined,
      });
    });

    return okResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
