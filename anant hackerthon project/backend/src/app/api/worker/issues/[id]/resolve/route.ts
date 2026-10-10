import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { resolveIssue } from '@/services/resolutionService';
import { errorResponse, okResponse } from '@/lib/http';
import { parseAndValidateUploads } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['WORKER']);
    const formData = await req.formData();
    const summary = formData.get('summary') as string;
    const internalNotes = formData.get('internal_notes') as string | null;
    const rawFiles = formData.getAll('proof_files') as File[];

    const validatedFiles = await parseAndValidateUploads(rawFiles);

    const result = await withTransaction(async (client) => {
      return await resolveIssue(client, {
        issueId: params.id,
        workerId: user.id,
        summary,
        internalNotes: internalNotes || undefined,
        proofFiles: validatedFiles,
      });
    });

    return okResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
