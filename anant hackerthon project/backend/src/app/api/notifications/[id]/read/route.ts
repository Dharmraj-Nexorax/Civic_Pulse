import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { noContentResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [params.id, user.id]
    );
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
