import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { startWork } from '@/services/resolutionService';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['WORKER']);
    await withTransaction(async (client) => {
      await startWork(client, params.id, user.id);
    });

    return okResponse({ message: 'Work started successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
