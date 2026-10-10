import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { aiCategorize } from '@/integrations/aiClient';
import { categorizeByKeywords } from '@/domain/keywordCategorizer';
import { generateFallbackAssist } from '@/domain/templates';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

const AssistSchema = z.object({
  description: z.string().min(1, 'Description is required'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const body = await req.json();
    const { description } = AssistSchema.parse(body);

    const { rows: categories } = await query<{
      id: string;
      key: string;
      name: string;
      keywords: string[];
    }>(
      'SELECT id, key, name, keywords FROM categories WHERE organization_id = $1 AND is_active = true',
      [user.organization_id]
    );

    // Try AI service first
    const aiResult = await aiCategorize(
      description,
      categories.map((c) => ({ key: c.key, name: c.name, keywords: c.keywords }))
    );

    if (aiResult && aiResult.ai_available) {
      const matchedCat = categories.find((c) => c.key === aiResult.category_key);
      return okResponse({
        ai_available: true,
        method: aiResult.method,
        category_key: aiResult.category_key,
        category_id: matchedCat ? matchedCat.id : null,
        confidence: aiResult.confidence,
        suggested_title: aiResult.suggested_title ?? `Issue — ${matchedCat?.name ?? 'Report'}`,
        cleaned_description: aiResult.cleaned_description ?? description.trim(),
        missing_info: aiResult.missing_info ?? [],
      });
    }

    // Deterministic fallback: keyword categorizer + template
    const kwResult = categorizeByKeywords(description, categories);
    const matchedCat = categories.find((c) => c.id === kwResult.categoryId);
    const tmpl = generateFallbackAssist(description, matchedCat?.name, null);

    return okResponse({
      ai_available: false,
      method: 'keyword',
      category_key: kwResult.categoryKey,
      category_id: kwResult.categoryId,
      confidence: null,
      suggested_title: tmpl.suggestedTitle,
      cleaned_description: tmpl.cleanedDescription,
      missing_info: tmpl.missingInfo,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
