export type IssueStatus =
  | 'REPORTED'
  | 'VERIFICATION'
  | 'GROUPED'
  | 'PRIORITIZED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CITIZEN_VERIFIED'
  | 'REOPENED';

export type ActorRole = 'SYSTEM' | 'CITIZEN' | 'WORKER' | 'ADMIN';

export class IllegalTransitionError extends Error {
  code = 'ILLEGAL_TRANSITION';
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'IllegalTransitionError';
  }
}

export interface TransitionContext {
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus;
  actorRole: ActorRole;
  isPrimaryReporter?: boolean;
  isAssignedWorker?: boolean;
  teamActive?: boolean;
  workerActive?: boolean;
  workerTeamIdMatches?: boolean;
  proofCount?: number;
  note?: string;
  reassignReason?: string;
  adminReason?: string;
  reopenReason?: string;
  citizenDecision?: 'VERIFIED' | 'REJECTED';
}

/**
 * Validates state machine transition according to Section 6.3.
 * Throws IllegalTransitionError if transition is illegal.
 */
export function validateTransition(ctx: TransitionContext): void {
  const { fromStatus, toStatus, actorRole } = ctx;

  // 1. (none) -> REPORTED
  if (fromStatus === null && toStatus === 'REPORTED') {
    if (actorRole !== 'CITIZEN') {
      throw new IllegalTransitionError('Only citizens can submit initial reports.');
    }
    return;
  }

  // 2. REPORTED -> VERIFICATION
  if (fromStatus === 'REPORTED' && toStatus === 'VERIFICATION') {
    if (actorRole !== 'SYSTEM') {
      throw new IllegalTransitionError('Only SYSTEM can transition REPORTED -> VERIFICATION.');
    }
    return;
  }

  // 3. VERIFICATION -> GROUPED
  if (fromStatus === 'VERIFICATION' && toStatus === 'GROUPED') {
    if (actorRole !== 'SYSTEM') {
      throw new IllegalTransitionError('Only SYSTEM can transition VERIFICATION -> GROUPED.');
    }
    return;
  }

  // 4. GROUPED -> PRIORITIZED
  if (fromStatus === 'GROUPED' && toStatus === 'PRIORITIZED') {
    if (actorRole !== 'SYSTEM') {
      throw new IllegalTransitionError('Only SYSTEM can transition GROUPED -> PRIORITIZED.');
    }
    return;
  }

  // 5. PRIORITIZED -> ASSIGNED
  if (fromStatus === 'PRIORITIZED' && toStatus === 'ASSIGNED') {
    if (actorRole !== 'ADMIN') {
      throw new IllegalTransitionError('Only ADMIN can assign issues.');
    }
    if (ctx.teamActive === false || ctx.workerActive === false) {
      throw new IllegalTransitionError('Target team and worker must both be active.');
    }
    if (ctx.workerTeamIdMatches === false) {
      throw new IllegalTransitionError('Worker must belong to assigned team.');
    }
    return;
  }

  // 6. ASSIGNED -> IN_PROGRESS
  if (fromStatus === 'ASSIGNED' && toStatus === 'IN_PROGRESS') {
    if (actorRole !== 'WORKER') {
      throw new IllegalTransitionError('Only assigned worker can start work.');
    }
    if (ctx.isAssignedWorker === false) {
      throw new IllegalTransitionError('Caller is not the assigned worker.');
    }
    return;
  }

  // 7. IN_PROGRESS -> RESOLVED
  if (fromStatus === 'IN_PROGRESS' && toStatus === 'RESOLVED') {
    if (actorRole === 'WORKER') {
      if (ctx.isAssignedWorker === false) {
        throw new IllegalTransitionError('Caller is not the assigned worker.');
      }
      if ((ctx.proofCount ?? 0) < 1) {
        throw new IllegalTransitionError('Worker must provide at least 1 proof media item to resolve.');
      }
      if (!ctx.note || ctx.note.trim() === '') {
        throw new IllegalTransitionError('Worker must provide a non-empty resolution note.');
      }
      return;
    }
    if (actorRole === 'ADMIN') {
      if (!ctx.note || ctx.note.trim() === '') {
        throw new IllegalTransitionError('Admin must provide a resolution note.');
      }
      if (!ctx.adminReason || ctx.adminReason.trim() === '') {
        throw new IllegalTransitionError('Admin must provide a reason when resolving on behalf.');
      }
      return;
    }
    throw new IllegalTransitionError('Only assigned worker or admin can resolve issue.');
  }

  // 8 & 9. RESOLVED -> CITIZEN_VERIFIED or REOPENED
  if (fromStatus === 'RESOLVED') {
    if (actorRole !== 'CITIZEN') {
      throw new IllegalTransitionError('Only the citizen can verify or reopen a resolved issue.');
    }
    if (ctx.isPrimaryReporter === false) {
      throw new IllegalTransitionError('Only the primary reporter can verify or reopen this issue.');
    }

    if (toStatus === 'CITIZEN_VERIFIED') {
      if (ctx.citizenDecision !== 'VERIFIED') {
        throw new IllegalTransitionError('Decision must be VERIFIED for CITIZEN_VERIFIED.');
      }
      return;
    }

    if (toStatus === 'REOPENED') {
      if (ctx.citizenDecision !== 'REJECTED') {
        throw new IllegalTransitionError('Decision must be REJECTED to reopen.');
      }
      if (!ctx.reopenReason || ctx.reopenReason.trim() === '') {
        throw new IllegalTransitionError('A non-empty reason is required to reject resolution.');
      }
      return;
    }
  }

  // 10. REOPENED -> IN_PROGRESS
  if (fromStatus === 'REOPENED' && toStatus === 'IN_PROGRESS') {
    if (actorRole !== 'WORKER') {
      throw new IllegalTransitionError('Only assigned worker can restart work on reopened issue.');
    }
    if (ctx.isAssignedWorker === false) {
      throw new IllegalTransitionError('Caller is not the assigned worker.');
    }
    return;
  }

  // 11. (ASSIGNED | IN_PROGRESS | REOPENED) -> ASSIGNED (Reassign)
  if (
    (fromStatus === 'ASSIGNED' || fromStatus === 'IN_PROGRESS' || fromStatus === 'REOPENED') &&
    toStatus === 'ASSIGNED'
  ) {
    if (actorRole !== 'ADMIN') {
      throw new IllegalTransitionError('Only ADMIN can reassign an issue.');
    }
    if (!ctx.reassignReason || ctx.reassignReason.trim() === '') {
      throw new IllegalTransitionError('A non-empty reason is required for reassignment.');
    }
    if (ctx.teamActive === false || ctx.workerActive === false) {
      throw new IllegalTransitionError('New team and worker must be active.');
    }
    if (ctx.workerTeamIdMatches === false) {
      throw new IllegalTransitionError('New worker must belong to selected team.');
    }
    return;
  }

  throw new IllegalTransitionError(
    `Illegal transition from ${fromStatus} to ${toStatus} by actor ${actorRole}.`
  );
}
