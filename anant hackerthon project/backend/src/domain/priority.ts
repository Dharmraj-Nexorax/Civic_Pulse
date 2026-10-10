export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SeverityLevel = 'MINOR' | 'SMALL_LOCAL' | 'SIGNIFICANT' | 'SERIOUS' | 'DANGEROUS';
export type ContextLevel = 'NORMAL' | 'SENSITIVE_LOCATION' | 'PUBLIC_FACILITY' | 'EMERGENCY' | 'PUBLIC_SAFETY';

export interface PriorityFactor {
  key: 'severity' | 'affected' | 'category' | 'context' | 'time';
  label: string;
  points: number;
  max: number;
  reason: string;
}

export interface PriorityBreakdown {
  total: number;
  band: PriorityBand;
  factors: PriorityFactor[];
  severity_reviewed: boolean;
  override: {
    band: PriorityBand;
    reason: string;
  } | null;
}

export interface PriorityInputs {
  severity: SeverityLevel;
  severityReviewed: boolean;
  affectedCount: number;
  categoryScore: number;
  categoryName: string;
  context: ContextLevel;
  createdAt: Date;
  resolvedAt?: Date | null;
  overrideBand?: PriorityBand | null;
  overrideReason?: string | null;
  now?: Date;
}

export function getSeverityPoints(severity: SeverityLevel): { points: number; reason: string } {
  switch (severity) {
    case 'MINOR':
      return { points: 5, reason: 'Minor inconvenience' };
    case 'SMALL_LOCAL':
      return { points: 10, reason: 'Small/local problem' };
    case 'SIGNIFICANT':
      return { points: 20, reason: 'Significant problem' };
    case 'SERIOUS':
      return { points: 25, reason: 'Serious public impact' };
    case 'DANGEROUS':
      return { points: 30, reason: 'Dangerous/critical' };
  }
}

export function getAffectedPoints(count: number): { points: number; reason: string } {
  const safeCount = Math.max(1, count);
  if (safeCount <= 5) {
    return { points: 5, reason: `≈1–5 citizens affected (from ${safeCount} reports)` };
  }
  if (safeCount <= 20) {
    return { points: 10, reason: `≈6–20 citizens affected (from ${safeCount} reports)` };
  }
  if (safeCount <= 50) {
    return { points: 15, reason: `≈21–50 citizens affected (from ${safeCount} reports)` };
  }
  if (safeCount <= 100) {
    return { points: 20, reason: `≈51–100 citizens affected (from ${safeCount} reports)` };
  }
  return { points: 25, reason: `≥101 citizens affected (from ${safeCount} reports)` };
}

export function getContextPoints(context: ContextLevel): { points: number; reason: string } {
  switch (context) {
    case 'NORMAL':
      return { points: 0, reason: 'Normal context' };
    case 'SENSITIVE_LOCATION':
      return { points: 5, reason: 'Sensitive location' };
    case 'PUBLIC_FACILITY':
      return { points: 8, reason: 'School / hospital / public facility' };
    case 'EMERGENCY':
      return { points: 12, reason: 'Emergency context' };
    case 'PUBLIC_SAFETY':
      return { points: 15, reason: 'Immediate public-safety concern' };
  }
}

export function getTimePoints(
  createdAt: Date,
  resolvedAt?: Date | null,
  nowDate: Date = new Date()
): { points: number; days: number; reason: string } {
  const end = resolvedAt ? resolvedAt.getTime() : nowDate.getTime();
  const diffMs = Math.max(0, end - createdAt.getTime());
  const d = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  let points = 0;
  if (d <= 1) {
    points = 0;
  } else if (d <= 3) {
    points = 2;
  } else if (d <= 7) {
    points = 5;
  } else if (d <= 14) {
    points = 8;
  } else {
    points = 10;
  }

  const dayStr = d === 1 ? '1 day' : `${d} days`;
  return { points, days: d, reason: `${dayStr} pending` };
}

export function scoreToBand(score: number): PriorityBand {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export function calculatePriority(inputs: PriorityInputs): {
  score: number;
  band: PriorityBand;
  effectiveBand: PriorityBand;
  breakdown: PriorityBreakdown;
} {
  const sev = getSeverityPoints(inputs.severity);
  const aff = getAffectedPoints(inputs.affectedCount);
  const catPoints = Math.max(0, Math.min(20, inputs.categoryScore));
  const ctx = getContextPoints(inputs.context);
  const time = getTimePoints(inputs.createdAt, inputs.resolvedAt, inputs.now);

  const rawTotal = sev.points + aff.points + catPoints + ctx.points + time.points;
  const total = Math.max(0, Math.min(100, rawTotal));
  const band = scoreToBand(total);
  const effectiveBand = inputs.overrideBand ?? band;

  const factors: PriorityFactor[] = [
    { key: 'severity', label: 'Severity', points: sev.points, max: 30, reason: sev.reason },
    { key: 'affected', label: 'Affected citizens', points: aff.points, max: 25, reason: aff.reason },
    { key: 'category', label: 'Category', points: catPoints, max: 20, reason: inputs.categoryName },
    { key: 'context', label: 'Context', points: ctx.points, max: 15, reason: ctx.reason },
    { key: 'time', label: 'Time pending', points: time.points, max: 10, reason: time.reason },
  ];

  const breakdown: PriorityBreakdown = {
    total,
    band,
    factors,
    severity_reviewed: inputs.severityReviewed,
    override: inputs.overrideBand
      ? {
          band: inputs.overrideBand,
          reason: inputs.overrideReason ?? 'Administrative override',
        }
      : null,
  };

  return {
    score: total,
    band,
    effectiveBand,
    breakdown,
  };
}
