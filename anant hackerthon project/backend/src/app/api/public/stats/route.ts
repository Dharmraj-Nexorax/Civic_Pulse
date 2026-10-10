import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [config.defaultOrgSlug]
    );

    if (orgRows.length === 0) {
      return okResponse({
        trackable_issues: 0,
        community_reports: 0,
        verified_resolutions: 0,
        active_wards: 0,
        includes_demo_data: false,
      });
    }
    const orgId = orgRows[0].id;

    const { rows: stats } = await query<{
      trackable_issues: string;
      community_reports: string;
      verified_resolutions: string;
      active_wards: string;
      demo_count: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM issues WHERE organization_id = $1 AND merged_into_issue_id IS NULL) as trackable_issues,
         (SELECT COUNT(*) FROM complaints WHERE organization_id = $1) as community_reports,
         (SELECT COUNT(*) FROM issues WHERE organization_id = $1 AND status = 'CITIZEN_VERIFIED') as verified_resolutions,
         (SELECT COUNT(DISTINCT ward_id) FROM issues WHERE organization_id = $1 AND merged_into_issue_id IS NULL) as active_wards,
         (SELECT COUNT(*) FROM issues WHERE organization_id = $1 AND is_demo = true) as demo_count`,
      [orgId]
    );

    const r = stats[0];
    const includesDemo = parseInt(r.demo_count, 10) > 0;

    return okResponse({
      trackable_issues: parseInt(r.trackable_issues, 10),
      community_reports: parseInt(r.community_reports, 10),
      verified_resolutions: parseInt(r.verified_resolutions, 10),
      active_wards: parseInt(r.active_wards, 10),
      includes_demo_data: includesDemo,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
