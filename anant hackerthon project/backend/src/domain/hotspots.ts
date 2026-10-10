export type HotspotLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WardAggregateInput {
  ward_id: string;
  ward_name: string;
  lat: number;
  lng: number;
  issue_count: number;
  report_count: number;
  open_count?: number;
  top_category_name: string | null;
  avg_priority_score?: number | null;
  category_breakdown?: { category_name: string; count: number }[];
}

export interface HotspotPublicItem {
  ward_id: string;
  ward_name: string;
  lat: number;
  lng: number;
  issue_count: number;
  report_count: number;
  level: HotspotLevel;
  top_category_name: string | null;
}

export interface HotspotAdminItem extends HotspotPublicItem {
  open_count: number;
  avg_priority_score: number | null;
  category_breakdown: { category_name: string; count: number }[];
}

export function computeHotspots(
  wards: WardAggregateInput[],
  days: number = 90
): {
  publicItems: HotspotPublicItem[];
  adminItems: HotspotAdminItem[];
  insight: string[];
} {
  const activeWards = wards.filter((w) => w.issue_count > 0);
  if (activeWards.length === 0) {
    return {
      publicItems: [],
      adminItems: [],
      insight: ['No civic issues reported in this time period.'],
    };
  }

  const maxIssues = Math.max(...activeWards.map((w) => w.issue_count));

  const publicItems: HotspotPublicItem[] = [];
  const adminItems: HotspotAdminItem[] = [];

  for (const ward of activeWards) {
    let level: HotspotLevel = 'LOW';
    if (activeWards.length === 1) {
      level = 'HIGH';
    } else {
      const ratio = maxIssues > 0 ? ward.issue_count / maxIssues : 0;
      if (ratio >= 0.66) level = 'HIGH';
      else if (ratio >= 0.33) level = 'MEDIUM';
      else level = 'LOW';
    }

    const publicItem: HotspotPublicItem = {
      ward_id: ward.ward_id,
      ward_name: ward.ward_name,
      lat: ward.lat,
      lng: ward.lng,
      issue_count: ward.issue_count,
      report_count: ward.report_count,
      level,
      top_category_name: ward.top_category_name,
    };
    publicItems.push(publicItem);

    adminItems.push({
      ...publicItem,
      open_count: ward.open_count ?? 0,
      avg_priority_score: ward.avg_priority_score ?? null,
      category_breakdown: ward.category_breakdown ?? [],
    });
  }

  // Sort by issue_count descending
  publicItems.sort((a, b) => b.issue_count - a.issue_count);
  adminItems.sort((a, b) => b.issue_count - a.issue_count);

  const insight: string[] = [];
  const topWard = publicItems[0];
  if (topWard) {
    const catText = topWard.top_category_name ? `${topWard.top_category_name} ` : '';
    insight.push(
      `${topWard.ward_name} has ${topWard.issue_count} ${catText}issues in the last ${days} days — the highest in this area.`
    );
  }

  return { publicItems, adminItems, insight };
}

export const computeWardHotspots = computeHotspots;
