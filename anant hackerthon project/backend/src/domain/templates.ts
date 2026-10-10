import { IssueStatus } from './stateMachine';

export function getNextStepText(status: IssueStatus, teamName?: string | null): string {
  const team = teamName ? teamName : 'the responsible team';
  switch (status) {
    case 'REPORTED':
      return 'Your report was received.';
    case 'VERIFICATION':
      return "Your report's details and location are being checked.";
    case 'GROUPED':
      return 'We are checking whether similar reports exist.';
    case 'PRIORITIZED':
      return 'Your issue is waiting to be assigned to a responsible team.';
    case 'ASSIGNED':
      return `Assigned to ${team}. Work has not started yet.`;
    case 'IN_PROGRESS':
      return `${team} is working on it.`;
    case 'RESOLVED':
      return 'The team marked this resolved. Please check the location and confirm whether it is really fixed.';
    case 'CITIZEN_VERIFIED':
      return 'Closed — you confirmed the fix.';
    case 'REOPENED':
      return 'You reported it was not fixed. It has been sent back to the team.';
  }
}

export function generateFallbackSummary(description: string): string {
  const cleaned = description.trim().replace(/\s+/g, ' ');
  const firstSentenceMatch = cleaned.match(/^([^.!?]+[.!?])/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[1] : cleaned;
  if (firstSentence.length <= 160) {
    return firstSentence;
  }
  return firstSentence.substring(0, 157) + '...';
}

export function generateFallbackAssist(
  description: string,
  categoryName?: string | null,
  wardName?: string | null
): {
  suggestedTitle: string;
  cleanedDescription: string;
  missingInfo: string[];
} {
  const cleaned = description.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);
  const missingInfo: string[] = [];

  if (words.length < 5) {
    missingInfo.push('Add more detail about what is wrong');
  }

  const cat = categoryName ?? 'Civic Issue';
  const ward = wardName ?? 'Area';
  const suggestedTitle = `${cat} — ${ward}`;

  return {
    suggestedTitle,
    cleanedDescription: cleaned,
    missingInfo,
  };
}

export function generateWorkerCopilotAdvice(
  title: string,
  categoryName: string,
  wardName: string
): string {
  return (
    `Issue: ${title} (${categoryName}, ${wardName})\n` +
    `Standard work sequence: Visit location → Inspect problem → Perform repair work → ` +
    `Capture at least 1 clear photo proof of resolution → Add a descriptive note → ` +
    `Submit resolution (Awaiting citizen verification).`
  );
}

export function generateResolutionReportDraft(
  workerNotes: string,
  proofCount: number
): string {
  const noteText = workerNotes.trim() ? workerNotes.trim() : 'Work completed at site.';
  return (
    `${noteText}\n\n` +
    `Resolution proof: ${proofCount} photo(s) attached.\n` +
    `Status: Resolved — Awaiting citizen verification.`
  );
}
