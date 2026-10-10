import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { notFound, forbidden } from '@/lib/errors';
import { errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    const { rows: mediaRows } = await query<{
      id: string;
      organization_id: string;
      storage_path: string;
      mime: string;
      issue_id: string | null;
      complaint_id: string | null;
    }>('SELECT id, organization_id, storage_path, mime, issue_id, complaint_id FROM media WHERE id = $1', [
      params.id,
    ]);

    if (mediaRows.length === 0) {
      throw notFound('Media file not found.');
    }
    const media = mediaRows[0];

    // Authorization check
    if (user.role !== 'ADMIN') {
      if (user.role === 'WORKER') {
        const { rows: assignRows } = await query(
          'SELECT id FROM assignments WHERE issue_id = $1 AND worker_id = $2',
          [media.issue_id, user.id]
        );
        if (assignRows.length === 0) {
          throw forbidden('Access denied to this media file.');
        }
      } else if (user.role === 'CITIZEN') {
        const { rows: compRows } = await query(
          'SELECT id FROM complaints WHERE (id = $1 OR issue_id = $2) AND citizen_id = $3',
          [media.complaint_id, media.issue_id, user.id]
        );
        if (compRows.length === 0) {
          throw forbidden('Access denied to this media file.');
        }
      }
    }

    const filePath = path.resolve(config.uploadDir, media.storage_path);
    if (!fs.existsSync(filePath)) {
      throw notFound('File not found on storage.');
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': media.mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
