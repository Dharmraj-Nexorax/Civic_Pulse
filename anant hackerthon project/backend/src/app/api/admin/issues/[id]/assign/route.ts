import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { assignIssue } from '@/services/assignmentService';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const body = await req.json();
    const { worker_id, team_id, reassign_reason } = body;

    await withTransaction(async (client) => {
      await assignIssue(client, {
        issueId: params.id,
        teamId: team_id,
        workerId: worker_id,
        adminId: user.id,
        orgId: user.organization_id,
        reassignReason: reassign_reason,
      });
    });

    return okResponse({ message: 'Worker assigned successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
