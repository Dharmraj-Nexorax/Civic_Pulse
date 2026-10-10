export interface WorkerTeamContribution {
  workerId: string;
  workerName: string;
  score: number | null;
  verifiedCount: number;
}

export function computeTeamScore(workers: WorkerTeamContribution[]): number | null {
  const eligible = workers.filter((w) => w.score !== null);
  if (eligible.length === 0) {
    return null;
  }

  const totalVerified = eligible.reduce((sum, w) => sum + w.verifiedCount, 0);

  if (totalVerified > 0) {
    const weightedSum = eligible.reduce(
      (sum, w) => sum + (w.score as number) * w.verifiedCount,
      0
    );
    return Number((weightedSum / totalVerified).toFixed(2));
  }

  // Fallback: simple average
  const simpleAvg = eligible.reduce((sum, w) => sum + (w.score as number), 0) / eligible.length;
  return Number(simpleAvg.toFixed(2));
}
