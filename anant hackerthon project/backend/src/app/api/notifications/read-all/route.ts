import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { noContentResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user.id]);
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
