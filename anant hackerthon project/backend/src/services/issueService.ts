import { PoolClient, getPool } from '../lib/db';
import { getNextStepText } from '../domain/templates';
import { notFound } from '../lib/errors';

export interface Ref {
  id: string;
  name: string;
}

export interface MediaItem {
  id: string;
  mime: string;
  url: string;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: 'SYSTEM' | 'CITIZEN' | 'WORKER' | 'ADMIN';
  note: string | null;
  created_at: string;
}

export interface PriorityInfo {
  score: number;
  band: string;
  effective_band: string;
  factors: any[];
  severity_reviewed: boolean;
  overridden: boolean;
  override_reason?: string;
}

export interface ResolutionInfo {
  id: string;
  resolved_at: string;
  note: string;
  proof: MediaItem[];
  citizen_decision: 'PENDING' | 'VERIFIED' | 'REJECTED';
  resolved_by_role: 'WORKER' | 'ADMIN';
}

export interface CitizenIssueView {
  complaint_id: string;
  complaint_no: string;
  issue_id: string;
  title: string;
  description: string;
  category: Ref & { key: string };
  ward: Ref;
  lat: number;
  lng: number;
  status: string;
  status_label: string;
  next_step_text: string;
  priority: Omit<PriorityInfo, 'override_reason'>;
  assigned_team_name: string | null;
  report_count: number;
  is_primary_reporter: boolean;
  awaiting_my_verification: boolean;
  media: MediaItem[];
  timeline: TimelineEvent[];
  resolution: ResolutionInfo | null;
  my_rating: number | null;
  created_at: string;
  updated_at: string;

  // Location metadata fields
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  location_method?: string | null;
  location_confirmed?: boolean;

  // Frontend compatibility fields
  category_name?: string;
  ward_name?: string;
  priority_band?: string | null;
  priority_score?: number | null;
  can_verify?: boolean;
  events?: TimelineEvent[];
  resolution_summary?: string | null;
  resolution_notes?: string | null;
  resolution_proof_urls?: string[];
  resolution_submitted_at?: string | null;
  verified_at?: string | null;
}

export function formatComplaintNo(seq: number | string): string {
  const num = typeof seq === 'string' ? parseInt(seq, 10) : seq;
  return `CP-${String(num).padStart(6, '0')}`;
}

export function getStatusLabel(status: string): string {
  if (status === 'RESOLVED') {
    return 'Resolved — Awaiting Citizen Confirmation';
  }
  return status;
}

export async function getCitizenIssueView(
  clientOrComplaintId: PoolClient | string,
  complaintIdOrCitizenId: string,
  citizenIdParam?: string
): Promise<CitizenIssueView> {
  if (typeof clientOrComplaintId === 'string') {
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
      return await getCitizenIssueView(client, clientOrComplaintId, complaintIdOrCitizenId);
    } finally {
      connection.release();
    }
  }

  const client = clientOrComplaintId;
  const complaintId = complaintIdOrCitizenId;
  const citizenId = citizenIdParam!;

  const { rows: compRows } = await client.query<{
    complaint_id: string;
    complaint_no: string | number;
    description: string;
    is_primary: boolean | number;
    comp_lat: number;
    comp_lng: number;
    comp_created_at: Date | string;
    issue_id: string;
    title: string;
    issue_status: string;
    priority_score: number;
    priority_band: string;
    priority_override_band: string | null;
    priority_breakdown: any;
    updated_at: Date | string;
    ward_id: string;
    ward_name: string;
    category_id: string;
    category_name: string;
    category_key: string;
    assigned_team_name: string | null;
    primary_reporter_id: string;
    address: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    location_method: string | null;
    location_confirmed: boolean | number | null;
  }>(
    `SELECT c.id as complaint_id, c.complaint_no, c.description, c.is_primary,
            c.lat as comp_lat, c.lng as comp_lng, c.created_at as comp_created_at,
            c.address, c.city, c.district, c.state, c.country, c.postal_code,
            c.location_method, c.location_confirmed,
            i.id as issue_id, i.title, i.status as issue_status,
            i.priority_score, i.priority_band, i.priority_override_band,
            i.priority_breakdown, i.updated_at,
            w.id as ward_id, w.name as ward_name,
            cat.id as category_id, cat.name as category_name, cat.key as category_key,
            t.name as assigned_team_name,
            (SELECT citizen_id FROM complaints pc WHERE pc.id = i.primary_complaint_id) as primary_reporter_id
     FROM complaints c
     JOIN issues i ON i.id = c.issue_id
     JOIN wards w ON w.id = c.ward_id
     JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN teams t ON t.id = i.assigned_team_id
     WHERE c.id = $1 AND c.citizen_id = $2`,
    [complaintId, citizenId]
  );

  if (compRows.length === 0) {
    throw notFound('Complaint not found.');
  }
  const r = compRows[0];

  // Report count
  const { rows: countRows } = await client.query<{ count: string | number }>(
    'SELECT COUNT(*) as count FROM complaints WHERE issue_id = $1',
    [r.issue_id]
  );
  const reportCount = parseInt(String(countRows[0].count), 10);

  // Media
  const { rows: mediaRows } = await client.query<{ id: string; mime: string }>(
    `SELECT id, mime FROM media WHERE complaint_id = $1 OR (issue_id = $2 AND kind = 'COMPLAINT')`,
    [r.complaint_id, r.issue_id]
  );
  const media: MediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    mime: m.mime,
    url: `/api/media/${m.id}`,
  }));

  // Timeline (only STATUS_CHANGE and REPORT_ADDED events for citizens)
  const { rows: eventRows } = await client.query<{
    id: string | number;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    actor_role: any;
    note: string | null;
    created_at: Date | string;
  }>(
    `SELECT id, event_type, from_status, to_status, actor_role, note, created_at
     FROM issue_events
     WHERE issue_id = $1 AND event_type IN ('STATUS_CHANGE', 'REPORT_ADDED')
     ORDER BY created_at ASC`,
    [r.issue_id]
  );
  const timeline: TimelineEvent[] = eventRows.map((e) => ({
    id: parseInt(String(e.id), 10),
    event_type: e.event_type,
    from_status: e.from_status,
    to_status: e.to_status,
    actor_role: e.actor_role,
    note: e.note,
    created_at: new Date(e.created_at).toISOString(),
  }));

  // Latest Resolution
  let resolution: ResolutionInfo | null = null;
  const { rows: resRows } = await client.query<{
    id: string;
    resolved_at: Date | string;
    note: string;
    citizen_decision: 'PENDING' | 'VERIFIED' | 'REJECTED';
    resolved_by_role: 'WORKER' | 'ADMIN';
  }>(
    `SELECT id, resolved_at, note, citizen_decision, resolved_by_role
     FROM resolutions
     WHERE issue_id = $1
     ORDER BY resolved_at DESC LIMIT 1`,
    [r.issue_id]
  );

  if (resRows.length > 0) {
    const resRow = resRows[0];
    const { rows: proofRows } = await client.query<{ id: string; mime: string }>(
      `SELECT id, mime FROM media WHERE resolution_id = $1`,
      [resRow.id]
    );
    resolution = {
      id: resRow.id,
      resolved_at: new Date(resRow.resolved_at).toISOString(),
      note: resRow.note,
      proof: proofRows.map((p) => ({ id: p.id, mime: p.mime, url: `/api/media/${p.id}` })),
      citizen_decision: resRow.citizen_decision,
      resolved_by_role: resRow.resolved_by_role,
    };
  }

  // Rating
  let myRating: number | null = null;
  if (resolution) {
    const { rows: rateRows } = await client.query<{ stars: number }>(
      `SELECT stars FROM ratings WHERE resolution_id = $1 AND citizen_id = $2`,
      [resolution.id, citizenId]
    );
    if (rateRows.length > 0) {
      myRating = rateRows[0].stars;
    }
  }

  const isPrimary = Boolean(r.is_primary);
  const awaitingVerification = isPrimary && r.issue_status === 'RESOLVED';
  const effectiveBand = r.priority_override_band ?? r.priority_band;

  let breakdownObj = r.priority_breakdown;
  if (typeof breakdownObj === 'string') {
    try {
      breakdownObj = JSON.parse(breakdownObj);
    } catch {
      breakdownObj = {};
    }
  }

  return {
    complaint_id: r.complaint_id,
    complaint_no: formatComplaintNo(r.complaint_no),
    issue_id: r.issue_id,
    title: r.title,
    description: r.description,
    category: {
      id: r.category_id,
      name: r.category_name,
      key: r.category_key,
    },
    ward: {
      id: r.ward_id,
      name: r.ward_name,
    },
    lat: r.comp_lat,
    lng: r.comp_lng,
    status: r.issue_status,
    status_label: getStatusLabel(r.issue_status),
    next_step_text: getNextStepText(r.issue_status as any, r.assigned_team_name),
    priority: {
      score: r.priority_score,
      band: r.priority_band,
      effective_band: effectiveBand,
      factors: breakdownObj?.factors ?? [],
      severity_reviewed: breakdownObj?.severity_reviewed ?? false,
      overridden: r.priority_override_band !== null,
    },
    assigned_team_name: r.assigned_team_name,
    report_count: reportCount,
    is_primary_reporter: isPrimary,
    awaiting_my_verification: awaitingVerification,
    media,
    timeline,
    resolution,
    my_rating: myRating,
    created_at: new Date(r.comp_created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),

    // Location metadata
    address: r.address || null,
    city: r.city || 'Mandsaur',
    district: r.district || 'Mandsaur',
    state: r.state || 'Madhya Pradesh',
    country: r.country || 'India',
    postal_code: r.postal_code || null,
    location_method: r.location_method || 'MANUAL',
    location_confirmed: r.location_confirmed ? true : false,

    // Frontend compatibility fields
    category_name: r.category_name,
    ward_name: r.ward_name,
    priority_band: effectiveBand,
    priority_score: r.priority_score,
    can_verify: awaitingVerification,
    events: timeline,
    resolution_summary: resolution?.note ?? null,
    resolution_notes: resolution?.note ?? null,
    resolution_proof_urls: resolution?.proof.map((p) => p.url) ?? [],
    resolution_submitted_at: resolution?.resolved_at ?? null,
    verified_at: r.issue_status === 'CITIZEN_VERIFIED' ? new Date(r.updated_at).toISOString() : null,
  };
}
