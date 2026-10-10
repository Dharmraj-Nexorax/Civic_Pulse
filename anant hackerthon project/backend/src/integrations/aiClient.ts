import { config } from '../lib/config';

export interface AiMeta {
  ai_available: boolean;
  method: 'embedding' | 'keyword' | 'rules' | 'llm' | 'template';
}

export interface AiCategorizeResult extends AiMeta {
  category_key: string | null;
  confidence: number | null;
  suggested_title: string | null;
  cleaned_description: string | null;
  missing_info: string[] | null;
}

export interface AiSimilarScore {
  issue_id: string;
  similarity: number;
}

export interface AiSimilarResult extends AiMeta {
  scores: AiSimilarScore[];
}

export interface AiTextResult extends AiMeta {
  text: string;
}

async function callAiService<T>(path: string, body: any): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);

  try {
    const res = await fetch(`${config.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': config.aiInternalKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data?.available === false) {
      return null;
    }
    return data as T;
  } catch {
    // Network error, timeout or abort -> graceful fallback
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function aiCategorize(
  text: string,
  categories: { key: string; name: string; keywords: string[] }[]
): Promise<AiCategorizeResult | null> {
  const res = await callAiService<any>('/ai/categorize', { text, categories });
  if (!res) return null;

  return {
    ai_available: true,
    method: res.method || 'embedding',
    category_key: res.category_key ?? null,
    confidence: res.confidence ?? null,
    suggested_title: res.suggested_title ?? null,
    cleaned_description: res.cleaned_description ?? null,
    missing_info: res.missing_info ?? null,
  };
}

export async function aiFindSimilar(
  newText: string,
  candidates: { issue_id: string; text: string }[]
): Promise<AiSimilarResult | null> {
  if (candidates.length === 0) {
    return { ai_available: true, method: 'embedding', scores: [] };
  }

  const res = await callAiService<any>('/ai/similar', {
    new: { text: newText },
    candidates,
  });
  if (!res) return null;

  return {
    ai_available: true,
    method: res.method || 'embedding',
    scores: res.scores ?? [],
  };
}

export async function aiSummarize(
  text: string,
  wardName: string,
  categoryName: string
): Promise<string | null> {
  const res = await callAiService<any>('/ai/summarize', {
    text,
    ward_name: wardName,
    category_name: categoryName,
  });
  if (!res || !res.summary) return null;
  return res.summary;
}

export async function aiStatusExplain(facts: any, question?: string): Promise<string | null> {
  const res = await callAiService<any>('/ai/status-explain', { facts, question });
  if (!res || !res.text) return null;
  return res.text;
}

export async function aiWorkerCopilot(facts: any, question?: string): Promise<string | null> {
  const res = await callAiService<any>('/ai/worker-copilot', { facts, question });
  if (!res || !res.text) return null;
  return res.text;
}

export async function aiResolutionReport(
  facts: any,
  workerNotes: string,
  proofCount: number
): Promise<string | null> {
  const res = await callAiService<any>('/ai/resolution-report', {
    facts,
    worker_notes: workerNotes,
    proof_count: proofCount,
  });
  if (!res || !res.draft) return null;
  return res.draft;
}

export async function aiAdminInsights(snapshot: any, question?: string): Promise<string | null> {
  const res = await callAiService<any>('/ai/admin-insights', { snapshot, question });
  if (!res || !res.answer) return null;
  return res.answer;
}
