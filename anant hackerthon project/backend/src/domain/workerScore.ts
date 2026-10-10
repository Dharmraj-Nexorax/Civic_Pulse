export type PerformanceLevel = 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';

export interface ScoreComponent {
  key: 'rating' | 'verified' | 'time' | 'reopen' | 'updates' | 'priority';
  label: string;
  raw: number | null;
  component_score: number | null;
  weight: number;
  effective_weight: number | null;
  points: number | null;
}

export interface ScoreBreakdown {
  score: number | null;
  level: PerformanceLevel | null;
  rating_stable: boolean;
  counts: {
    resolved: number;
    verified: number;
    rejected: number;
    pending: number;
    ratings: number;
  };
  components: ScoreComponent[];
}

export interface WorkerDataForScore {
  ratings: number[]; // array of star values (1..5)
  resolutions: {
    citizenDecision: 'PENDING' | 'VERIFIED' | 'REJECTED';
    effectiveHours: number;
    expectedHours: number;
    proofCount: number;
    onTime: boolean;
  }[];
  startOpportunities: {
    acceptedAt: Date | null;
    startWasTimely: boolean | null;
  }[];
  priorityAssignments: {
    isOverdue: boolean;
    hasResolution: boolean;
    onTime?: boolean;
  }[];
}

export function computeWorkerScore(data: WorkerDataForScore): ScoreBreakdown {
  // Counts
  const ratingsCount = data.ratings.length;
  let verifiedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  const resolvedCount = data.resolutions.length;

  for (const r of data.resolutions) {
    if (r.citizenDecision === 'VERIFIED') verifiedCount++;
    else if (r.citizenDecision === 'REJECTED') rejectedCount++;
    else pendingCount++;
  }

  // 1. Rating (R) - Weight 30%
  let rScore: number | null = null;
  let rRaw: number | null = null;
  if (ratingsCount > 0) {
    const avgStars = data.ratings.reduce((sum, s) => sum + s, 0) / ratingsCount;
    rRaw = Number(avgStars.toFixed(2));
    rScore = (avgStars / 5) * 100;
  }

  // 2. Verified Resolution (V) - Weight 25%
  let vScore: number | null = null;
  let vRaw: number | null = null;
  const decided = verifiedCount + rejectedCount;
  if (decided > 0) {
    vScore = (verifiedCount / decided) * 100;
    vRaw = Number(vScore.toFixed(1));
  }

  // 3. Resolution Time (T) - Weight 15%
  let tScore: number | null = null;
  let tRaw: number | null = null;
  if (resolvedCount > 0) {
    let tSum = 0;
    for (const res of data.resolutions) {
      if (res.effectiveHours <= 0) {
        tSum += 100;
      } else {
        tSum += Math.min(100, (res.expectedHours / res.effectiveHours) * 100);
      }
    }
    tScore = tSum / resolvedCount;
    tRaw = Number(tScore.toFixed(1));
  }

  // 4. Reopen Rate (RO) - Weight 10%
  let roScore: number | null = null;
  let roRaw: number | null = null;
  if (resolvedCount > 0) {
    const roRate = (rejectedCount / resolvedCount) * 100;
    roRaw = Number(roRate.toFixed(1));
    roScore = Math.max(0, 100 - roRate);
  }

  // 5. Work Updates (U) - Weight 10%
  let uScore: number | null = null;
  let uRaw: number | null = null;
  let uOpportunities = 0;
  let uSatisfied = 0;

  for (const s of data.startOpportunities) {
    uOpportunities++;
    if (s.acceptedAt !== null && s.startWasTimely === true) {
      uSatisfied++;
    }
  }

  for (const res of data.resolutions) {
    uOpportunities++;
    if (res.proofCount >= 1) {
      uSatisfied++;
    }
  }

  if (uOpportunities > 0) {
    uScore = (uSatisfied / uOpportunities) * 100;
    uRaw = Number(uScore.toFixed(1));
  }

  // 6. Priority Handling (P) - Weight 10%
  let pScore: number | null = null;
  let pRaw: number | null = null;
  let pTotal = 0;
  let pHandled = 0;

  for (const pa of data.priorityAssignments) {
    if (pa.hasResolution || pa.isOverdue) {
      pTotal++;
      if (pa.onTime === true) {
        pHandled++;
      }
    }
  }

  if (pTotal > 0) {
    pScore = (pHandled / pTotal) * 100;
    pRaw = Number(pScore.toFixed(1));
  }

  // Base weights definition
  const rawComponents: {
    key: 'rating' | 'verified' | 'time' | 'reopen' | 'updates' | 'priority';
    label: string;
    raw: number | null;
    score: number | null;
    weight: number;
  }[] = [
    { key: 'rating', label: 'Citizen Rating', raw: rRaw, score: rScore, weight: 0.30 },
    { key: 'verified', label: 'Verified Resolution', raw: vRaw, score: vScore, weight: 0.25 },
    { key: 'time', label: 'Resolution Time', raw: tRaw, score: tScore, weight: 0.15 },
    { key: 'reopen', label: 'Reopen Prevention', raw: roRaw, score: roScore, weight: 0.10 },
    { key: 'updates', label: 'Work Updates', raw: uRaw, score: uScore, weight: 0.10 },
    { key: 'priority', label: 'Priority Handling', raw: pRaw, score: pScore, weight: 0.10 },
  ];

  // Renormalize weights for non-null components
  const availableWeight = rawComponents.reduce(
    (sum, c) => (c.score !== null ? sum + c.weight : sum),
    0
  );

  let totalScore: number | null = null;
  if (availableWeight > 0) {
    let weightedSum = 0;
    for (const c of rawComponents) {
      if (c.score !== null) {
        weightedSum += c.score * (c.weight / availableWeight);
      }
    }
    totalScore = Number(weightedSum.toFixed(1));
  }

  let level: PerformanceLevel | null = null;
  if (totalScore !== null) {
    if (totalScore >= 90) level = 'Excellent';
    else if (totalScore >= 75) level = 'Good';
    else if (totalScore >= 60) level = 'Needs Improvement';
    else level = 'Poor';
  }

  const components: ScoreComponent[] = rawComponents.map((c) => {
    const effectiveWeight =
      c.score !== null && availableWeight > 0 ? c.weight / availableWeight : null;
    const points =
      c.score !== null && effectiveWeight !== null
        ? Number((c.score * effectiveWeight).toFixed(1))
        : null;

    return {
      key: c.key,
      label: c.label,
      raw: c.raw,
      component_score: c.score !== null ? Number(c.score.toFixed(1)) : null,
      weight: c.weight * 100,
      effective_weight: effectiveWeight !== null ? Number((effectiveWeight * 100).toFixed(1)) : null,
      points,
    };
  });

  return {
    score: totalScore,
    level,
    rating_stable: ratingsCount >= 5,
    counts: {
      resolved: resolvedCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      ratings: ratingsCount,
    },
    components,
  };
}
