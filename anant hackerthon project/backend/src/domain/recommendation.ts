export interface WorkerCandidate {
  workerId: string;
  workerName: string;
  teamId: string;
  teamName: string;
  isActive: boolean;
  activeIssuesCount: number;
  teamAvgActiveIssues: number;
  categoryVerifiedCount: number;
  workerScore: number | null;
}

export interface RecommendationResult {
  worker: { id: string; name: string };
  team: { id: string; name: string };
  active_issues: number;
  reasons: string[];
}

export function recommendWorkers(
  candidates: WorkerCandidate[],
  defaultTeamId: string | null
): RecommendationResult[] {
  // Only active workers
  const eligible = candidates.filter((c) => c.isActive);

  eligible.sort((a, b) => {
    // 1. Belongs to default team
    const aDef = defaultTeamId && a.teamId === defaultTeamId ? 1 : 0;
    const bDef = defaultTeamId && b.teamId === defaultTeamId ? 1 : 0;
    if (aDef !== bDef) return bDef - aDef;

    // 2. Fewest active issues
    if (a.activeIssuesCount !== b.activeIssuesCount) {
      return a.activeIssuesCount - b.activeIssuesCount;
    }

    // 3. Most verified in same category
    if (a.categoryVerifiedCount !== b.categoryVerifiedCount) {
      return b.categoryVerifiedCount - a.categoryVerifiedCount;
    }

    // 4. Higher worker score (null last)
    if (a.workerScore !== null && b.workerScore !== null) {
      if (a.workerScore !== b.workerScore) return b.workerScore - a.workerScore;
    } else if (a.workerScore !== null) {
      return -1;
    } else if (b.workerScore !== null) {
      return 1;
    }

    // 5. Name A->Z
    return a.workerName.localeCompare(b.workerName);
  });

  return eligible.map((c) => {
    const reasons: string[] = [];
    if (defaultTeamId && c.teamId === defaultTeamId) {
      reasons.push(`Member of default team (${c.teamName})`);
    } else {
      reasons.push(`Member of ${c.teamName}`);
    }

    const diff = (c.activeIssuesCount - c.teamAvgActiveIssues).toFixed(1);
    reasons.push(
      `${c.activeIssuesCount} active issues (team avg: ${c.teamAvgActiveIssues.toFixed(1)})`
    );

    if (c.categoryVerifiedCount > 0) {
      reasons.push(`${c.categoryVerifiedCount} verified resolutions in this category`);
    }

    if (c.workerScore !== null) {
      reasons.push(`Performance score: ${c.workerScore}`);
    }

    return {
      worker: { id: c.workerId, name: c.workerName },
      team: { id: c.teamId, name: c.teamName },
      active_issues: c.activeIssuesCount,
      reasons,
    };
  });
}
