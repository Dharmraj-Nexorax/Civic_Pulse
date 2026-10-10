import { PoolClient, getPool } from '../lib/db';

export interface MetricValue {
  value: number | null;
  numerator?: number;
  denominator?: number;
}

export interface AnalyticsDictionary {
  total_issues: MetricValue;
  total_complaints: MetricValue;
  resolution_rate: MetricValue;
  verified_resolution_rate: MetricValue;
  closure_rate: MetricValue;
  reopen_rate: MetricValue;
  assignment_rate: MetricValue;
  unassigned_rate: MetricValue;
  pending_rate: MetricValue;
  avg_resolution_days: MetricValue;
  avg_citizen_verification_hours: MetricValue;
  overdue_rate: MetricValue;
  on_time_resolution_rate: MetricValue;
  critical_issue_rate: MetricValue;
  duplicate_rate: MetricValue;
  grouping_efficiency: MetricValue;
  priority_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  categories_breakdown: { category_name: string; count: number; closure_rate: number | null }[];
  wards_breakdown: { ward_name: string; count: number; closure_rate: number | null }[];
}

export function calcRate(num: number, den: number): MetricValue {
  if (den === 0) return { value: null, numerator: num, denominator: den };
  return {
    value: Number(((num / den) * 100).toFixed(1)),
    numerator: num,
    denominator: den,
  };
}

export async function computeOrganizationMetrics(
  clientOrOrgId: PoolClient | string,
  orgIdOrDays?: string | number,
  daysParam = 90
): Promise<AnalyticsDictionary> {
  if (typeof clientOrOrgId === 'string') {
    const orgId = clientOrOrgId;
    const days = typeof orgIdOrDays === 'number' ? orgIdOrDays : daysParam;
    const pool = getPool();
    const connection = await pool.getConnection();
    const client: PoolClient = {
      async query(text, params) {
        const { sql, values } = (await import('../lib/db')).translateSql(text, params);
        const [result] = await connection.query(sql, values);
        if (Array.isArray(result)) {
          return { rows: result as any[], rowCount: result.length };
        }
        return { rows: [], rowCount: (result as any).affectedRows || 0 };
      },
    };
    try {
      return await computeOrganizationMetrics(client, orgId, days);
    } finally {
      connection.release();
    }
  }

  const client = clientOrOrgId;
  const orgId = orgIdOrDays as string;

  // 1. Issues & Complaints counts
  const { rows: countRows } = await client.query<{
    total_issues: string | number;
    total_complaints: string | number;
    non_primary_complaints: string | number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM issues WHERE organization_id = $1 AND merged_into_issue_id IS NULL) as total_issues,
       (SELECT COUNT(*) FROM complaints WHERE organization_id = $1) as total_complaints,
       (SELECT COUNT(*) FROM complaints WHERE organization_id = $1 AND is_primary = 0) as non_primary_complaints`,
    [orgId]
  );

  const totalIssues = parseInt(String(countRows[0].total_issues), 10);
  const totalComplaints = parseInt(String(countRows[0].total_complaints), 10);
  const nonPrimaryComplaints = parseInt(String(countRows[0].non_primary_complaints), 10);

  // 2. Status buckets
  const { rows: bucketRows } = await client.query<{
    status: string;
    count: string | number;
  }>(
    `SELECT status, COUNT(*) as count
     FROM issues
     WHERE organization_id = $1 AND merged_into_issue_id IS NULL
     GROUP BY status`,
    [orgId]
  );

  const statusMap = new Map<string, number>();
  for (const b of bucketRows) {
    statusMap.set(b.status, parseInt(String(b.count), 10));
  }

  const openCount =
    (statusMap.get('REPORTED') || 0) +
    (statusMap.get('VERIFICATION') || 0) +
    (statusMap.get('GROUPED') || 0) +
    (statusMap.get('PRIORITIZED') || 0);
  const assignedCount = statusMap.get('ASSIGNED') || 0;
  const inProgressCount = statusMap.get('IN_PROGRESS') || 0;
  const resolvedCount = statusMap.get('RESOLVED') || 0;
  const verifiedCount = statusMap.get('CITIZEN_VERIFIED') || 0;
  const reopenedCount = statusMap.get('REOPENED') || 0;

  // 3. Resolutions metrics
  const { rows: resStats } = await client.query<{
    total_resolutions: string | number;
    verified_resolutions: string | number;
    rejected_resolutions: string | number;
    on_time_resolutions: string | number;
    avg_effective_hours: string | number | null;
  }>(
    `SELECT
       COUNT(*) as total_resolutions,
       COUNT(CASE WHEN r.citizen_decision = 'VERIFIED' THEN 1 END) as verified_resolutions,
       COUNT(CASE WHEN r.citizen_decision = 'REJECTED' THEN 1 END) as rejected_resolutions,
       COUNT(CASE WHEN r.on_time = 1 THEN 1 END) as on_time_resolutions,
       AVG(r.effective_hours) as avg_effective_hours
     FROM resolutions r
     JOIN issues i ON i.id = r.issue_id
     WHERE i.organization_id = $1`,
    [orgId]
  );

  const totalResolutions = parseInt(String(resStats[0]?.total_resolutions || 0), 10);
  const verifiedResolutions = parseInt(String(resStats[0]?.verified_resolutions || 0), 10);
  const rejectedResolutions = parseInt(String(resStats[0]?.rejected_resolutions || 0), 10);
  const onTimeResolutions = parseInt(String(resStats[0]?.on_time_resolutions || 0), 10);
  const avgEffectiveHours = resStats[0]?.avg_effective_hours !== null && resStats[0]?.avg_effective_hours !== undefined
    ? parseFloat(String(resStats[0].avg_effective_hours))
    : null;

  // 4. Assigned issues ever
  const { rows: assignedEverRows } = await client.query<{ count: string | number }>(
    `SELECT COUNT(*) as count FROM issues
     WHERE organization_id = $1 AND merged_into_issue_id IS NULL AND assigned_at IS NOT NULL`,
    [orgId]
  );
  const assignedEver = parseInt(String(assignedEverRows[0]?.count || 0), 10);

  // 5. Verification time (disambiguated r.resolved_at and r.decided_at)
  const { rows: verifTimeRows } = await client.query<{ avg_hours: string | number | null }>(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, r.resolved_at, r.decided_at) / 3600.0) as avg_hours
     FROM resolutions r
     JOIN issues i ON i.id = r.issue_id
     WHERE i.organization_id = $1 AND r.decided_at IS NOT NULL`,
    [orgId]
  );
  const avgVerifHours = verifTimeRows[0]?.avg_hours !== null && verifTimeRows[0]?.avg_hours !== undefined
    ? Number(parseFloat(String(verifTimeRows[0].avg_hours)).toFixed(1))
    : null;

  // 6. Overdue issues
  const { rows: overdueRows } = await client.query<{ count: string | number }>(
    `SELECT COUNT(*) as count FROM assignments a
     JOIN issues i ON i.id = a.issue_id
     WHERE i.organization_id = $1
       AND i.status IN ('ASSIGNED', 'IN_PROGRESS', 'REOPENED')
       AND a.ended_at IS NULL
       AND NOW() > DATE_ADD(a.assigned_at, INTERVAL a.expected_hours HOUR)`,
    [orgId]
  );
  const overdueCount = parseInt(String(overdueRows[0]?.count || 0), 10);
  const activeCount = assignedCount + inProgressCount + reopenedCount;

  // 7. Critical issues
  const { rows: critRows } = await client.query<{ count: string | number }>(
    `SELECT COUNT(*) as count FROM issues
     WHERE organization_id = $1 AND merged_into_issue_id IS NULL
       AND COALESCE(priority_override_band, priority_band) = 'CRITICAL'`,
    [orgId]
  );
  const criticalCount = parseInt(String(critRows[0].count), 10);

  // 8. Priority distribution
  const { rows: bandRows } = await client.query<{ band: string; count: string | number }>(
    `SELECT COALESCE(priority_override_band, priority_band) as band, COUNT(*) as count
     FROM issues
     WHERE organization_id = $1 AND merged_into_issue_id IS NULL
     GROUP BY band`,
    [orgId]
  );
  const priorityDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const b of bandRows) {
    if (b.band in priorityDistribution) {
      (priorityDistribution as any)[b.band] = parseInt(String(b.count), 10);
    }
  }

  // 9. Categories breakdown
  const { rows: catRows } = await client.query<{
    category_name: string;
    total: string | number;
    verified: string | number;
  }>(
    `SELECT c.name as category_name,
            COUNT(i.id) as total,
            COUNT(CASE WHEN i.status = 'CITIZEN_VERIFIED' THEN i.id END) as verified
     FROM categories c
     LEFT JOIN issues i ON i.category_id = c.id AND i.merged_into_issue_id IS NULL
     WHERE c.organization_id = $1
     GROUP BY c.id, c.name`,
    [orgId]
  );
  const categoriesBreakdown = catRows.map((c) => {
    const tot = parseInt(String(c.total), 10);
    const ver = parseInt(String(c.verified), 10);
    return {
      category_name: c.category_name,
      count: tot,
      closure_rate: tot > 0 ? Number(((ver / tot) * 100).toFixed(1)) : null,
    };
  });

  // 10. Wards breakdown
  const { rows: wardRows } = await client.query<{
    ward_name: string;
    total: string | number;
    verified: string | number;
  }>(
    `SELECT w.name as ward_name,
            COUNT(i.id) as total,
            COUNT(CASE WHEN i.status = 'CITIZEN_VERIFIED' THEN i.id END) as verified
     FROM wards w
     LEFT JOIN issues i ON i.ward_id = w.id AND i.merged_into_issue_id IS NULL
     WHERE w.organization_id = $1
     GROUP BY w.id, w.name`,
    [orgId]
  );
  const wardsBreakdown = wardRows.map((w) => {
    const tot = parseInt(String(w.total), 10);
    const ver = parseInt(String(w.verified), 10);
    return {
      ward_name: w.ward_name,
      count: tot,
      closure_rate: tot > 0 ? Number(((ver / tot) * 100).toFixed(1)) : null,
    };
  });

  // Rates calculation
  const resolutionRate = calcRate(resolvedCount + verifiedCount, assignedEver);
  const decidedResolutions = verifiedResolutions + rejectedResolutions;
  const verifiedResolutionRate = calcRate(verifiedResolutions, decidedResolutions);
  const closureRate = calcRate(verifiedCount, totalIssues);
  const reopenRate = calcRate(rejectedResolutions, totalResolutions);

  const postVerificationIssues = totalIssues - (statusMap.get('REPORTED') || 0);
  const assignmentRate = calcRate(assignedEver, postVerificationIssues);
  const unassignedRate = calcRate(statusMap.get('PRIORITIZED') || 0, postVerificationIssues);
  const pendingRate = calcRate(openCount + assignedCount + inProgressCount, totalIssues);

  const avgResolutionDays: MetricValue = {
    value: avgEffectiveHours !== null ? Number((avgEffectiveHours / 24).toFixed(1)) : null,
    denominator: totalResolutions > 0 ? totalResolutions : 0,
  };

  const avgCitizenVerificationHours: MetricValue = {
    value: avgVerifHours,
    denominator: decidedResolutions > 0 ? decidedResolutions : 0,
  };

  const overdueRate = calcRate(overdueCount, activeCount);
  const onTimeResolutionRate = calcRate(onTimeResolutions, totalResolutions);
  const criticalIssueRate = calcRate(criticalCount, totalIssues);
  const duplicateRate = calcRate(nonPrimaryComplaints, totalComplaints);

  const groupingEfficiency: MetricValue = {
    value: totalIssues > 0 ? Number((totalComplaints / totalIssues).toFixed(2)) : null,
    numerator: totalComplaints,
    denominator: totalIssues,
  };

  return {
    total_issues: { value: totalIssues },
    total_complaints: { value: totalComplaints },
    resolution_rate: resolutionRate,
    verified_resolution_rate: verifiedResolutionRate,
    closure_rate: closureRate,
    reopen_rate: reopenRate,
    assignment_rate: assignmentRate,
    unassigned_rate: unassignedRate,
    pending_rate: pendingRate,
    avg_resolution_days: avgResolutionDays,
    avg_citizen_verification_hours: avgCitizenVerificationHours,
    overdue_rate: overdueRate,
    on_time_resolution_rate: onTimeResolutionRate,
    critical_issue_rate: criticalIssueRate,
    duplicate_rate: duplicateRate,
    grouping_efficiency: groupingEfficiency,
    priority_distribution: priorityDistribution,
    categories_breakdown: categoriesBreakdown,
    wards_breakdown: wardsBreakdown,
  };
}
