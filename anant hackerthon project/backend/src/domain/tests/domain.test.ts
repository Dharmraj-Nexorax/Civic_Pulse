import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePriority,
  scoreToBand,
  getAffectedPoints,
  getTimePoints,
} from '../priority';
import {
  computeWorkerScore,
} from '../workerScore';
import {
  computeTeamScore,
} from '../teamScore';
import {
  validateTransition,
  IllegalTransitionError,
} from '../stateMachine';
import {
  haversineDistanceMeters,
  validateCoordinates,
  validateMandsaurServiceArea,
  MANDSAUR_CONFIG,
} from '../../lib/geo';

test('Section 15.1 - Priority Vector 1 (Water leakage): (25, 20, 18, 8, 5) => 76 => HIGH', () => {
  // severity 25 (SERIOUS), affected 20 (e.g. 51-100 count -> 20), category 18, context 8 (PUBLIC_FACILITY), time 5 (e.g. 5 days -> 5)
  const createdAt = new Date('2026-10-01T00:00:00Z');
  const now = new Date('2026-10-06T00:00:00Z'); // 5 days => 5 pts

  const result = calculatePriority({
    severity: 'SERIOUS', // 25
    severityReviewed: true,
    affectedCount: 60, // 20
    categoryScore: 18, // 18
    categoryName: 'Water Supply',
    context: 'PUBLIC_FACILITY', // 8
    createdAt,
    now,
  });

  assert.equal(result.score, 76);
  assert.equal(result.band, 'HIGH');
  assert.equal(result.effectiveBand, 'HIGH');
});

test('Section 15.1 - Priority Vector 2 (Broken road): (30, 25, 18, 15, 8) => 96 => CRITICAL', () => {
  // severity 30 (DANGEROUS), affected 25 (101+), category 18, context 15 (PUBLIC_SAFETY), time 8 (e.g. 10 days -> 8)
  const createdAt = new Date('2026-10-01T00:00:00Z');
  const now = new Date('2026-10-11T00:00:00Z'); // 10 days => 8 pts

  const result = calculatePriority({
    severity: 'DANGEROUS', // 30
    severityReviewed: true,
    affectedCount: 120, // 25
    categoryScore: 18, // 18
    categoryName: 'Roads (damage)',
    context: 'PUBLIC_SAFETY', // 15
    createdAt,
    now,
  });

  assert.equal(result.score, 96);
  assert.equal(result.band, 'CRITICAL');
});

test('Section 15.1 - Priority Vector 3 (Garbage pileup): (10, 15, 12, 5, 5) => 47 => MEDIUM', () => {
  const createdAt = new Date('2026-10-01T00:00:00Z');
  const now = new Date('2026-10-06T00:00:00Z'); // 5 days => 5 pts

  const result = calculatePriority({
    severity: 'SMALL_LOCAL', // 10
    severityReviewed: true,
    affectedCount: 30, // 15
    categoryScore: 12, // 12
    categoryName: 'Garbage / Waste',
    context: 'SENSITIVE_LOCATION', // 5
    createdAt,
    now,
  });

  assert.equal(result.score, 47);
  assert.equal(result.band, 'MEDIUM');
});

test('Section 15.1 - Priority Vector 4 (Minor streetlight): (8 pts not direct severity, but from factors) => 30 => LOW', () => {
  // severity 5 (MINOR), affected 5 (1-5), category 15, context 0 (NORMAL), time 5 (4-7 days) => 30 => LOW
  const createdAt = new Date('2026-10-01T00:00:00Z');
  const now = new Date('2026-10-06T00:00:00Z'); // 5 days => 5 pts

  const result = calculatePriority({
    severity: 'MINOR', // 5
    severityReviewed: false,
    affectedCount: 3, // 5
    categoryScore: 15, // 15
    categoryName: 'Streetlight / Electricity',
    context: 'NORMAL', // 0
    createdAt,
    now,
  });

  assert.equal(result.score, 30);
  assert.equal(result.band, 'LOW');
});

test('Section 15.1 - Priority Band edges: 34->LOW, 35->MEDIUM, 59->MEDIUM, 60->HIGH, 79->HIGH, 80->CRITICAL', () => {
  assert.equal(scoreToBand(34), 'LOW');
  assert.equal(scoreToBand(35), 'MEDIUM');
  assert.equal(scoreToBand(59), 'MEDIUM');
  assert.equal(scoreToBand(60), 'HIGH');
  assert.equal(scoreToBand(79), 'HIGH');
  assert.equal(scoreToBand(80), 'CRITICAL');
});

test('Section 15.1 - Affected points vectors: [3->5, 6->10, 20->10, 21->15, 50->15, 51->20, 100->20, 101->25, 150->25]', () => {
  assert.equal(getAffectedPoints(3).points, 5);
  assert.equal(getAffectedPoints(6).points, 10);
  assert.equal(getAffectedPoints(20).points, 10);
  assert.equal(getAffectedPoints(21).points, 15);
  assert.equal(getAffectedPoints(50).points, 15);
  assert.equal(getAffectedPoints(51).points, 20);
  assert.equal(getAffectedPoints(100).points, 20);
  assert.equal(getAffectedPoints(101).points, 25);
  assert.equal(getAffectedPoints(150).points, 25);
});

test('Section 15.1 - Time points for d days: [0->0, 1->0, 2->2, 3->2, 4->5, 7->5, 8->8, 14->8, 15->10]', () => {
  const base = new Date('2026-10-01T00:00:00Z');
  const checkDays = (d: number) => {
    const end = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);
    return getTimePoints(base, end).points;
  };
  assert.equal(checkDays(0), 0);
  assert.equal(checkDays(1), 0);
  assert.equal(checkDays(2), 2);
  assert.equal(checkDays(3), 2);
  assert.equal(checkDays(4), 5);
  assert.equal(checkDays(7), 5);
  assert.equal(checkDays(8), 8);
  assert.equal(checkDays(14), 8);
  assert.equal(checkDays(15), 10);
});

test('Section 15.1 - Worker score vector: R=92, V=94, T=100, RO=3(->97), U=90, P=90 => 93.8, level Excellent', () => {
  // Construct data matching:
  // R=92: avg stars = 4.6 (e.g. ratings [4.6] -> 92%)
  // V=94: verified / (verified + rejected) = 94% (e.g. 94 verified, 6 rejected)
  // T=100: on-time 100%
  // RO=3: 3 rejected of 100 resolutions => 3% reopen rate => RO component = 97
  // U=90: 9 out of 10 satisfied
  // P=90: 9 out of 10 handled on-time
  const ratings = [5, 5, 5, 4, 4]; // 23/5 = 4.6 avg => 92%

  const resolutions: {
    citizenDecision: 'PENDING' | 'VERIFIED' | 'REJECTED';
    effectiveHours: number;
    expectedHours: number;
    proofCount: number;
    onTime: boolean;
  }[] = [];

  for (let i = 0; i < 94; i++) {
    resolutions.push({
      citizenDecision: 'VERIFIED',
      effectiveHours: 20,
      expectedHours: 48,
      proofCount: 1,
      onTime: true,
    });
  }
  for (let i = 0; i < 6; i++) {
    resolutions.push({
      citizenDecision: 'REJECTED',
      effectiveHours: 20,
      expectedHours: 48,
      proofCount: 1,
      onTime: true,
    });
  }
  // 100 additional pending resolutions so total is 200 (6 rejected / 200 = 3% reopen rate)
  // Among all 200 resolutions: 180 have proofCount = 1, 20 have proofCount = 0 (180 / 200 = 90% work updates)
  for (let i = 0; i < 80; i++) {
    resolutions.push({
      citizenDecision: 'PENDING',
      effectiveHours: 20,
      expectedHours: 48,
      proofCount: 1,
      onTime: true,
    });
  }
  for (let i = 0; i < 20; i++) {
    resolutions.push({
      citizenDecision: 'PENDING',
      effectiveHours: 20,
      expectedHours: 48,
      proofCount: 0,
      onTime: true,
    });
  }

  const startOpportunities: any[] = [];

  // 10 priority assignments: 9 on-time, 1 overdue/late
  const priorityAssignments = [
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: false, hasResolution: true, onTime: true },
    { isOverdue: true, hasResolution: false, onTime: false },
  ];

  const breakdown = computeWorkerScore({
    ratings,
    resolutions,
    startOpportunities,
    priorityAssignments,
  });

  assert.equal(breakdown.level, 'Excellent');
  assert.equal(breakdown.rating_stable, true);
  // Total score should be close to 93.8
  assert.ok(
    breakdown.score !== null && Math.abs(breakdown.score - 93.8) < 0.5,
    `Score was ${breakdown.score}, expected ≈93.8`
  );
});

test('Section 15.1 - Worker score missing component renormalizes; all-null -> null', () => {
  const allNull = computeWorkerScore({
    ratings: [],
    resolutions: [],
    startOpportunities: [],
    priorityAssignments: [],
  });
  assert.equal(allNull.score, null);
  assert.equal(allNull.level, null);

  // Only ratings available (5 stars => 100%)
  const onlyRatings = computeWorkerScore({
    ratings: [5],
    resolutions: [],
    startOpportunities: [],
    priorityAssignments: [],
  });
  assert.equal(onlyRatings.score, 100);
  assert.equal(onlyRatings.rating_stable, false); // < 5 ratings is provisional
});

test('Section 15.1 - Team score vector: (95 * 50 + 85 * 10) / 60 = 93.33', () => {
  const teamScore = computeTeamScore([
    {
      workerId: 'w1',
      workerName: 'Worker 1',
      score: 95,
      verifiedCount: 50,
    },
    {
      workerId: 'w2',
      workerName: 'Worker 2',
      score: 85,
      verifiedCount: 10,
    },
  ]);
  assert.equal(teamScore, 93.33);
});

test('Section 15.1 - State machine transitions and ILLEGAL_TRANSITION checks', () => {
  // Legal transition: REPORTED -> VERIFICATION by SYSTEM
  assert.doesNotThrow(() => {
    validateTransition({
      fromStatus: 'REPORTED',
      toStatus: 'VERIFICATION',
      actorRole: 'SYSTEM',
    });
  });

  // Illegal actor: REPORTED -> VERIFICATION by CITIZEN
  assert.throws(
    () => {
      validateTransition({
        fromStatus: 'REPORTED',
        toStatus: 'VERIFICATION',
        actorRole: 'CITIZEN',
      });
    },
    (err: any) => err instanceof IllegalTransitionError && err.code === 'ILLEGAL_TRANSITION'
  );

  // Illegal jump: REPORTED -> RESOLVED
  assert.throws(
    () => {
      validateTransition({
        fromStatus: 'REPORTED',
        toStatus: 'RESOLVED',
        actorRole: 'WORKER',
      });
    },
    (err: any) => err instanceof IllegalTransitionError && err.code === 'ILLEGAL_TRANSITION'
  );

  // RESOLVED -> CITIZEN_VERIFIED by non-primary reporter throws
  assert.throws(
    () => {
      validateTransition({
        fromStatus: 'RESOLVED',
        toStatus: 'CITIZEN_VERIFIED',
        actorRole: 'CITIZEN',
        isPrimaryReporter: false,
        citizenDecision: 'VERIFIED',
      });
    },
    (err: any) => err instanceof IllegalTransitionError
  );

  // RESOLVED -> CITIZEN_VERIFIED by worker/admin throws
  assert.throws(
    () => {
      validateTransition({
        fromStatus: 'RESOLVED',
        toStatus: 'CITIZEN_VERIFIED',
        actorRole: 'WORKER',
        citizenDecision: 'VERIFIED',
      });
    },
    (err: any) => err instanceof IllegalTransitionError
  );

  // Legal RESOLVED -> CITIZEN_VERIFIED by primary reporter
  assert.doesNotThrow(() => {
    validateTransition({
      fromStatus: 'RESOLVED',
      toStatus: 'CITIZEN_VERIFIED',
      actorRole: 'CITIZEN',
      isPrimaryReporter: true,
      citizenDecision: 'VERIFIED',
    });
  });

  // Legal RESOLVED -> REOPENED with reason
  assert.doesNotThrow(() => {
    validateTransition({
      fromStatus: 'RESOLVED',
      toStatus: 'REOPENED',
      actorRole: 'CITIZEN',
      isPrimaryReporter: true,
      citizenDecision: 'REJECTED',
      reopenReason: 'Still leaking after repair',
    });
  });

  // Illegal RESOLVED -> REOPENED without reason
  assert.throws(() => {
    validateTransition({
      fromStatus: 'RESOLVED',
      toStatus: 'REOPENED',
      actorRole: 'CITIZEN',
      isPrimaryReporter: true,
      citizenDecision: 'REJECTED',
      reopenReason: '',
    });
  });
});

test('Alerts domain - generateAlerts and computeAlerts', async () => {
  const { generateAlerts, computeAlerts } = await import('../alerts');

  // Test generateAlerts
  const alerts = generateAlerts({
    issues: [
      {
        id: 'iss-1',
        title: 'Broken bridge',
        status: 'PRIORITIZED',
        effectiveBand: 'CRITICAL',
        createdAt: new Date(),
        assignedAt: null,
      },
      {
        id: 'iss-2',
        title: 'Old leak',
        status: 'ASSIGNED',
        effectiveBand: 'HIGH',
        createdAt: new Date(Date.now() - 200 * 3600 * 1000), // > 96h SLA
        assignedAt: new Date(Date.now() - 200 * 3600 * 1000),
      },
    ],
    workers: [
      { id: 'w-1', name: 'Worker Alpha', activeIssuesCount: 6 },
      { id: 'w-2', name: 'Worker Beta', activeIssuesCount: 1 },
    ],
  });

  assert.ok(alerts.some((a) => a.id === 'CRITICAL_UNASSIGNED'));
  assert.ok(alerts.some((a) => a.id === 'OVERDUE_ISSUES'));
  assert.ok(alerts.some((a) => a.id.startsWith('WORKER_OVERLOAD_')));

  // Test computeAlerts
  const computed = computeAlerts({
    criticalUnassignedCount: 2,
    overdueIssues: [{ id: 'iss-1', isCritical: true }],
    workerOverloads: [{ workerId: 'w-1', workerName: 'Worker Alpha', teamName: 'Water', activeCount: 5, teamAvgActive: 2 }],
    highReopenEntities: [{ name: 'Roads Team', isTeam: true, reopenRatePct: 25, totalResolutions: 10 }],
    wardSurges: [{ wardId: 'ward-1', wardName: 'Ward 1', recent7dCount: 10, previous7dCount: 3 }],
  });

  assert.equal(computed.length, 5);
  assert.ok(computed.every((a) => a.message && a.severity));
});

test('Hotspots domain - computeWardHotspots', async () => {
  const { computeWardHotspots } = await import('../hotspots');

  const res = computeWardHotspots([
    {
      ward_id: 'w1',
      ward_name: 'Ward 1',
      lat: 12.34,
      lng: 56.78,
      issue_count: 10,
      report_count: 15,
      top_category_name: 'Water Supply',
    },
    {
      ward_id: 'w2',
      ward_name: 'Ward 2',
      lat: 12.35,
      lng: 56.79,
      issue_count: 2,
      report_count: 2,
      top_category_name: 'Streetlight',
    },
  ]);

  assert.equal(res.publicItems.length, 2);
  assert.equal(res.adminItems.length, 2);
  assert.equal(res.publicItems[0].level, 'HIGH');
  assert.ok(res.insight.length > 0);
});

test('Mandsaur Geo - Coordinate validation and boundary enforcement', () => {
  // 1. Valid coordinates
  const valid = validateCoordinates(MANDSAUR_CONFIG.centerLat, MANDSAUR_CONFIG.centerLng);
  assert.equal(valid.valid, true);
  assert.equal(valid.lat, 24.0768);
  assert.equal(valid.lng, 75.0693);

  // 2. Invalid ranges and non-numeric
  assert.equal(validateCoordinates(95, 75).valid, false);
  assert.equal(validateCoordinates(24, 195).valid, false);
  assert.equal(validateCoordinates('abc', 75).valid, false);

  // 3. Mandsaur center is inside service area
  const centerCheck = validateMandsaurServiceArea(24.0768, 75.0693);
  assert.equal(centerCheck.isWithinServiceArea, true);
  assert.ok(centerCheck.distanceFromCenterMeters < 100);

  // 4. Mandsaur Nai Abadi / Ward locations are inside service area
  const naiAbadi = validateMandsaurServiceArea(24.0812, 75.0685);
  assert.equal(naiAbadi.isWithinServiceArea, true);

  // 5. Delhi coordinates (28.6139, 77.2090) are rejected as outside service area
  const delhiCheck = validateMandsaurServiceArea(28.6139, 77.209);
  assert.equal(delhiCheck.isWithinServiceArea, false);
  assert.ok(delhiCheck.message?.includes('outside the currently supported CivicPulse service area'));

  // 6. Indore coordinates (22.7196, 75.8577) are rejected as outside service area
  const indoreCheck = validateMandsaurServiceArea(22.7196, 75.8577);
  assert.equal(indoreCheck.isWithinServiceArea, false);
});


