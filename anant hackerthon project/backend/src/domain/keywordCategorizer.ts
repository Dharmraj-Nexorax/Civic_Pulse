export interface CategoryWithKeywords {
  id: string;
  key: string;
  name: string;
  keywords: string[];
}

export function categorizeByKeywords(
  text: string,
  categories: CategoryWithKeywords[]
): {
  categoryId: string | null;
  categoryKey: string | null;
  categoryName: string | null;
  matchCount: number;
} {
  const normalizedText = text.toLowerCase();
  let bestMatch: CategoryWithKeywords | null = null;
  let maxHits = 0;

  for (const cat of categories) {
    let hits = 0;
    for (const kw of cat.keywords) {
      if (kw.trim() && normalizedText.includes(kw.toLowerCase())) {
        hits++;
      }
    }
    if (hits > maxHits) {
      maxHits = hits;
      bestMatch = cat;
    }
  }

  if (bestMatch && maxHits > 0) {
    return {
      categoryId: bestMatch.id,
      categoryKey: bestMatch.key,
      categoryName: bestMatch.name,
      matchCount: maxHits,
    };
  }

  return {
    categoryId: null,
    categoryKey: null,
    categoryName: null,
    matchCount: 0,
  };
}
