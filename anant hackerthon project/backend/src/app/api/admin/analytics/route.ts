import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { computeOrganizationMetrics } from '@/services/metricsService';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const daysParam = parseInt(req.nextUrl.searchParams.get('days') || '90', 10);
    const days = isNaN(daysParam) ? 90 : daysParam;
    const metrics = await computeOrganizationMetrics(user.organization_id, days);
    return okResponse({ metrics });
  } catch (error) {
    return errorResponse(error);
  }
}
