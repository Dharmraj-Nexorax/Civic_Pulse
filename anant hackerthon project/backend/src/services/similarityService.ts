import { PoolClient } from '../lib/db';
import { haversineDistanceMeters } from '../lib/geo';
import { aiFindSimilar } from '../integrations/aiClient';

export interface SimilarMatch {
  issue_id: string;
  title: string;
  report_count: number;
  status: string;
  status_label: string;
  distance_m: number;
  similarity: number | null;
}

export interface SimilarityResult {
  ai_available: boolean;
  method: 'embedding' | 'rules';
  matches: SimilarMatch[];
}

export async function findSimilarIssues(
  client: PoolClient,
  orgId: string,
  categoryId: string,
  description: string,
  lat: number,
  lng: number,
  radiusMeters = 500,
  similarityThreshold = 0.60
): Promise<SimilarityResult> {
  // 1. Fetch active candidate issues in same organization
  const { rows: candidates } = await client.query<{
    id: string;
    title: string;
    status: string;
    category_id: string;
    lat: number;
    lng: number;
    primary_description: string;
    report_count: string | number;
  }>(
    `SELECT i.id, i.title, i.status, i.category_id, i.lat, i.lng,
            COALESCE(c.description, i.title) as primary_description,
            (SELECT COUNT(*) FROM complaints comp WHERE comp.issue_id = i.id) as report_count
     FROM issues i
     LEFT JOIN complaints c ON c.id = i.primary_complaint_id
     WHERE i.organization_id = $1
       AND i.merged_into_issue_id IS NULL
       AND i.status IN ('REPORTED', 'VERIFICATION', 'GROUPED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')
     LIMIT 100`,
    [orgId]
  );

  // Filter within radiusMeters using Haversine
  const nearby = candidates
    .map((c) => ({
      ...c,
      distance_m: haversineDistanceMeters(lat, lng, c.lat, c.lng),
      report_count: parseInt(String(c.report_count), 10),
    }))
    .filter((c) => c.distance_m <= radiusMeters)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, 20);

  if (nearby.length === 0) {
    return {
      ai_available: true,
      method: 'embedding',
      matches: [],
    };
  }

  // 2. Try AI embedding similarity
  const aiInput = nearby.map((n) => ({
    issue_id: n.id,
    text: n.primary_description,
  }));

  const aiResult = await aiFindSimilar(description, aiInput);

  if (aiResult && aiResult.ai_available && aiResult.scores.length > 0) {
    const scoreMap = new Map<string, number>();
    for (const s of aiResult.scores) {
      scoreMap.set(s.issue_id, s.similarity);
    }

    const matches: SimilarMatch[] = nearby
      .map((n) => ({
        issue_id: n.id,
        title: n.title,
        report_count: n.report_count,
        status: n.status,
        status_label: n.status === 'RESOLVED' ? 'Awaiting Citizen Confirmation' : n.status,
        distance_m: n.distance_m,
        similarity: scoreMap.get(n.id) ?? 0,
      }))
      .filter((m) => (m.similarity ?? 0) >= similarityThreshold)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

    return {
      ai_available: true,
      method: 'embedding',
      matches,
    };
  }

  // 3. Fallback: rules (same category, ordered by distance, similarity: null)
  const fallbackMatches: SimilarMatch[] = nearby
    .filter((n) => n.category_id === categoryId)
    .map((n) => ({
      issue_id: n.id,
      title: n.title,
      report_count: n.report_count,
      status: n.status,
      status_label: n.status === 'RESOLVED' ? 'Awaiting Citizen Confirmation' : n.status,
      distance_m: n.distance_m,
      similarity: null,
    }));

  return {
    ai_available: false,
    method: 'rules',
    matches: fallbackMatches,
  };
}
