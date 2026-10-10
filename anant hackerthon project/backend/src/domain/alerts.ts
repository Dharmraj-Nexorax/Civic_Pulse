export interface Alert {
  id: string;
  level: 'urgent' | 'attention';
  severity?: string;
  title: string;
  detail: string;
  message?: string;
  link: string;
}

export interface AlertsInputData {
  criticalUnassignedCount: number;
  overdueIssues: { id: string; isCritical: boolean }[];
  workerOverloads: {
    workerId: string;
    workerName: string;
    teamName: string;
    activeCount: number;
    teamAvgActive: number;
  }[];
  highReopenEntities: {
    name: string;
    isTeam: boolean;
    reopenRatePct: number;
    totalResolutions: number;
  }[];
  wardSurges: {
    wardId: string;
    wardName: string;
    recent7dCount: number;
    previous7dCount: number;
  }[];
}

export function computeAlerts(data: AlertsInputData): Alert[] {
  const alerts: Alert[] = [];

  // 1. CRITICAL_UNASSIGNED
  if (data.criticalUnassignedCount >= 1) {
    const detail = `${data.criticalUnassignedCount} issue(s) with CRITICAL priority are waiting in the prioritized queue without assignment.`;
    alerts.push({
      id: 'CRITICAL_UNASSIGNED',
      level: 'urgent',
      severity: 'URGENT',
      title: `${data.criticalUnassignedCount} Critical Issue${data.criticalUnassignedCount > 1 ? 's' : ''} Unassigned`,
      detail,
      message: detail,
      link: '/admin/issues?unassigned=true&band=CRITICAL',
    });
  }

  // 2. OVERDUE_ISSUES
  if (data.overdueIssues.length >= 1) {
    const hasCritical = data.overdueIssues.some((i) => i.isCritical);
    const detail = `${data.overdueIssues.length} active issue(s) have passed their SLA resolution window.${hasCritical ? ' Includes critical priority issues.' : ''}`;
    alerts.push({
      id: 'OVERDUE_ISSUES',
      level: hasCritical ? 'urgent' : 'attention',
      severity: hasCritical ? 'URGENT' : 'ATTENTION',
      title: `${data.overdueIssues.length} Overdue Issue${data.overdueIssues.length > 1 ? 's' : ''}`,
      detail,
      message: detail,
      link: '/admin/issues?overdue=true',
    });
  }

  // 3. WORKER_OVERLOAD
  for (const w of data.workerOverloads) {
    const detail = `${w.workerName} has ${w.activeCount} active issues (${w.activeCount >= 1.5 * w.teamAvgActive ? '1.5x' : ''} above team average of ${w.teamAvgActive.toFixed(1)}).`;
    alerts.push({
      id: `WORKER_OVERLOAD_${w.workerId}`,
      level: 'attention',
      severity: 'ATTENTION',
      title: `Worker Overload: ${w.workerName}`,
      detail,
      message: detail,
      link: `/admin/workers/${w.workerId}`,
    });
  }

  // 4. HIGH_REOPEN_RATE
  for (const ent of data.highReopenEntities) {
    const detail = `${ent.isTeam ? 'Team' : 'Worker'} ${ent.name} has a reopen rate of ${ent.reopenRatePct.toFixed(1)}% across ${ent.totalResolutions} resolutions (threshold: 20%).`;
    alerts.push({
      id: `HIGH_REOPEN_${ent.name.replace(/\s+/g, '_')}`,
      level: 'attention',
      severity: 'ATTENTION',
      title: `High Reopen Rate: ${ent.name}`,
      detail,
      message: detail,
      link: ent.isTeam ? '/admin/teams' : '/admin/workers',
    });
  }

  // 5. WARD_SURGE
  for (const ws of data.wardSurges) {
    const detail = `${ws.wardName} reported ${ws.recent7dCount} complaints in the last 7 days compared to ${ws.previous7dCount} in the prior week.`;
    alerts.push({
      id: `WARD_SURGE_${ws.wardId}`,
      level: 'attention',
      severity: 'ATTENTION',
      title: `Complaint Surge in ${ws.wardName}`,
      detail,
      message: detail,
      link: `/admin/intelligence?ward_id=${ws.wardId}`,
    });
  }

  return alerts;
}

export interface GenerateAlertsInput {
  issues: {
    id: string;
    title: string;
    status: string;
    effectiveBand: string;
    createdAt: Date;
    assignedAt: Date | null;
  }[];
  workers: {
    id: string;
    name: string;
    activeIssuesCount: number;
  }[];
}

export function generateAlerts(input: GenerateAlertsInput): Alert[] {
  const alerts: Alert[] = [];

  // 1. Critical unassigned
  const criticalUnassigned = input.issues.filter(
    (i) =>
      i.effectiveBand === 'CRITICAL' &&
      ['REPORTED', 'VERIFICATION', 'GROUPED', 'PRIORITIZED'].includes(i.status)
  );

  if (criticalUnassigned.length >= 1) {
    const detail = `${criticalUnassigned.length} issue(s) with CRITICAL priority are waiting in the prioritized queue without assignment.`;
    alerts.push({
      id: 'CRITICAL_UNASSIGNED',
      level: 'urgent',
      severity: 'URGENT',
      title: `${criticalUnassigned.length} Critical Issue${criticalUnassigned.length > 1 ? 's' : ''} Unassigned`,
      detail,
      message: detail,
      link: '/admin/issues?unassigned=true&band=CRITICAL',
    });
  }

  // 2. Overdue issues (based on SLA)
  const now = Date.now();
  const overdueIssues = input.issues.filter((i) => {
    if (!['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(i.status)) return false;
    const baseTime = i.assignedAt ? i.assignedAt.getTime() : i.createdAt.getTime();
    const slaHours = i.effectiveBand === 'CRITICAL' ? 48 : i.effectiveBand === 'HIGH' ? 96 : 168;
    return now - baseTime > slaHours * 3600 * 1000;
  });

  if (overdueIssues.length >= 1) {
    const hasCritical = overdueIssues.some((i) => i.effectiveBand === 'CRITICAL');
    const detail = `${overdueIssues.length} active issue(s) have passed their SLA resolution window.${hasCritical ? ' Includes critical priority issues.' : ''}`;
    alerts.push({
      id: 'OVERDUE_ISSUES',
      level: hasCritical ? 'urgent' : 'attention',
      severity: hasCritical ? 'URGENT' : 'ATTENTION',
      title: `${overdueIssues.length} Overdue Issue${overdueIssues.length > 1 ? 's' : ''}`,
      detail,
      message: detail,
      link: '/admin/issues?overdue=true',
    });
  }

  // 3. Worker overloads
  if (input.workers.length > 0) {
    const totalActive = input.workers.reduce((acc, w) => acc + w.activeIssuesCount, 0);
    const avgActive = totalActive / input.workers.length;
    for (const w of input.workers) {
      if (w.activeIssuesCount >= 3 && (avgActive === 0 || w.activeIssuesCount >= 1.5 * avgActive)) {
        const detail = `${w.name} has ${w.activeIssuesCount} active issues (${avgActive > 0 ? (w.activeIssuesCount / avgActive).toFixed(1) + 'x ' : ''}above average of ${avgActive.toFixed(1)}).`;
        alerts.push({
          id: `WORKER_OVERLOAD_${w.id}`,
          level: 'attention',
          severity: 'ATTENTION',
          title: `Worker Overload: ${w.name}`,
          detail,
          message: detail,
          link: `/admin/workers`,
        });
      }
    }
  }

  return alerts;
}
