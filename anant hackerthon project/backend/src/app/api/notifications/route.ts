import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const unreadOnly = req.nextUrl.searchParams.get('unread_only') === 'true';

    const whereClause = unreadOnly
      ? 'WHERE user_id = $1 AND is_read = false'
      : 'WHERE user_id = $1';

    const { rows: items } = await query<{
      id: string;
      type: string;
      message: string;
      issue_id: string | null;
      is_read: boolean;
      created_at: Date;
    }>(
      `SELECT id, type, message, issue_id, is_read, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );

    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.id]
    );
    const unreadCount = parseInt(countRows[0].count, 10);

    return okResponse({
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        message: i.message,
        issue_id: i.issue_id,
        is_read: i.is_read,
        created_at: i.created_at.toISOString(),
      })),
      unread_count: unreadCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
