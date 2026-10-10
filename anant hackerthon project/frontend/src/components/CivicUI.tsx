import React from 'react';

// --- Icons (Inline SVGs to avoid dependencies per spec) ---
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18M5.293 5.293l13.414 13.414M5.293 18.707l13.414-13.414"/>
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

export type IssueStatus = 'REPORTED' | 'VERIFICATION' | 'GROUPED' | 'PRIORITIZED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CITIZEN_VERIFIED' | 'REOPENED';
export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// --- 1. StatusChip ---
export function StatusChip({ status }: { status: IssueStatus }) {
  if (status === 'CITIZEN_VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[var(--black)] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <CheckIcon /> Verified
      </span>
    );
  }
  if (status === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-white border border-[var(--black)] text-[var(--black)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        Awaiting Citizen Confirmation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-[var(--section-gray)] border border-[var(--border)] text-[var(--text)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
      {status.replace('_', ' ')}
    </span>
  );
}

// --- 2. PriorityBadge ---
export function PriorityBadge({ band }: { band: PriorityBand }) {
  const config = {
    CRITICAL: { bg: 'bg-[var(--black)] text-white border-transparent', bars: 4 },
    HIGH: { bg: 'bg-white text-[var(--black)] border-[var(--black)] border-2', bars: 3 },
    MEDIUM: { bg: 'bg-[var(--section-gray)] text-[var(--text)] border-transparent', bars: 2 },
    LOW: { bg: 'bg-[var(--surface-light)] text-[var(--text)] border-[var(--border)] border', bars: 1 },
  };
  
  const { bg, bars } = config[band] || config['LOW'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg}`}>
      <div className="flex items-end gap-[2px] h-[10px]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-[3px] rounded-sm ${i <= bars ? 'bg-current' : 'bg-transparent border border-current opacity-30'}`} style={{ height: `${25 * i}%` }} />
        ))}
      </div>
      {band}
    </span>
  );
}

// --- 3. AiBadge ---
export function AiBadge({ type = 'suggestion' }: { type?: 'suggestion' | 'system' }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
      <SparkleIcon />
      {type === 'suggestion' ? 'AI Suggestion' : 'System Generated'}
    </span>
  );
}

// --- 4. LifecycleTimeline ---
interface TimelineEvent {
  status: IssueStatus;
  timestamp?: string;
  isCurrent?: boolean;
}

export function LifecycleTimeline({ events, hasReopened }: { events: TimelineEvent[], hasReopened?: boolean }) {
  let baseStages: IssueStatus[] = ['REPORTED', 'VERIFICATION', 'GROUPED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFIED'];
  if (hasReopened) {
    baseStages = ['REPORTED', 'VERIFICATION', 'GROUPED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFIED'];
  }

  return (
    <div className="flex flex-col gap-0 py-4">
      {baseStages.map((stage, idx) => {
        const matchingEvent = events.find(e => e.status === stage);
        const isDone = !!matchingEvent;
        const isCurrent = matchingEvent?.isCurrent;
        
        return (
          <div key={`${stage}-${idx}`} className="flex gap-4 relative">
            {/* Line segment */}
            {idx < baseStages.length - 1 && (
              <div className="absolute left-[7px] top-6 bottom-[-8px] w-[2px] bg-[var(--section-gray)]" />
            )}
            
            {/* Node */}
            <div className="relative z-10 flex flex-col items-center mt-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                isCurrent ? 'border-[var(--black)] bg-white' : 
                isDone ? 'border-[var(--black)] bg-[var(--black)]' : 
                'border-[var(--border)] bg-[var(--surface-light)]'
              }`}>
                {isDone && !isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                {isCurrent && <div className="w-1.5 h-1.5 bg-[var(--black)] rounded-full" />}
              </div>
            </div>
            
            {/* Content */}
            <div className="pb-6">
              <div className={`text-sm font-semibold ${isCurrent ? 'text-[var(--black)]' : isDone ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                {stage === 'RESOLVED' ? 'Awaiting Citizen Confirmation' : stage.replace('_', ' ')}
              </div>
              {matchingEvent?.timestamp && (
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {new Date(matchingEvent.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- 5. NotificationBell ---
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative p-2 cursor-pointer text-[var(--text)] hover:bg-[var(--surface-light)] rounded-full transition-colors">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-[var(--black)] text-white text-[9px] font-bold rounded-full border-2 border-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}

// --- 6. PriorityBreakdownTable ---
export interface PriorityFactor { key: string; label: string; points: number; max: number; reason: string; }
export function PriorityBreakdownTable({ factors, total, band }: { factors: PriorityFactor[], total: number, band: PriorityBand }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-[var(--surface-light)] px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
        <h3 className="font-bold text-sm">Priority Breakdown</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Total: {total}/100</span>
          <PriorityBadge band={band} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--background)] text-[var(--muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">Factor</th>
              <th className="px-4 py-3 font-semibold">Points</th>
              <th className="px-4 py-3 font-semibold">Reasoning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {factors.map((f, i) => (
              <tr key={i} className="bg-[var(--background)]">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{f.label}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold">{f.points}</span> <span className="text-[var(--muted)]">/ {f.max}</span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)] min-w-[200px]">{f.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 7. Stars ---
export function Stars({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={`focus:outline-none ${!onChange && 'cursor-default'} ${star <= rating ? 'text-[var(--black)]' : 'text-[var(--border)]'}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={star <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
      ))}
    </div>
  );
}

// --- 8. ScoreBreakdownTable ---
interface ScoreComponent { label: string; raw: number|null; component_score: number|null; weight: number; points: number|null; }
export function ScoreBreakdownTable({ components, totalScore }: { components: ScoreComponent[], totalScore: number|null }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-[var(--black)] text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold text-sm">Worker Performance Score</h3>
        <span className="text-xl font-black">{totalScore !== null ? totalScore.toFixed(1) : '—'}</span>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-[var(--surface-light)] text-[var(--muted)] border-b border-[var(--border)] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 font-semibold">Component</th>
            <th className="px-4 py-3 font-semibold text-right">Raw</th>
            <th className="px-4 py-3 font-semibold text-right">0-100</th>
            <th className="px-4 py-3 font-semibold text-right">Weight</th>
            <th className="px-4 py-3 font-semibold text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--background)]">
          {components.map((c, i) => (
            <tr key={i}>
              <td className="px-4 py-3 font-medium">{c.label}</td>
              <td className="px-4 py-3 text-right">{c.raw !== null ? c.raw : '—'}</td>
              <td className="px-4 py-3 text-right">{c.component_score !== null ? c.component_score : '—'}</td>
              <td className="px-4 py-3 text-right text-[var(--muted)]">{c.weight}%</td>
              <td className="px-4 py-3 text-right font-bold">{c.points !== null ? c.points.toFixed(1) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
