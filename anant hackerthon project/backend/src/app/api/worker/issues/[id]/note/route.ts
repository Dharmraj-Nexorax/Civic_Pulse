import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { addWorkerNote } from '@/services/resolutionService';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['WORKER']);
    const body = await req.json();
    const { note } = body;

    await withTransaction(async (client) => {
      await addWorkerNote(client, params.id, user.id, note);
    });

    return okResponse({ message: 'Note recorded successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
