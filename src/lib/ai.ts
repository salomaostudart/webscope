/**
 * Workers AI client — fetches AI-powered suggestions from the Worker.
 * Falls back gracefully if AI is unavailable (rate limit, error).
 */

import type { AuditResult } from '../analyzers/base/analyzer.interface';

export interface QuickWin {
  title: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick-fix' | 'moderate' | 'complex';
  category: string;
  estimatedScoreGain: number;
}

export interface AISuggestions {
  summary: string;
  quickWins: QuickWin[];
}

const WORKER_URL =
  import.meta.env?.PUBLIC_WORKER_URL || 'https://webscope-api.salomaomstudart.workers.dev';

export async function fetchAISuggestions(result: AuditResult): Promise<AISuggestions | null> {
  try {
    const response = await fetch(`${WORKER_URL}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        findings: result.allFindings.map((f) => ({
          id: f.id,
          severity: f.severity,
          title: f.title,
          recommendation: f.recommendation,
          analyzer: f.analyzer,
          category: f.category,
        })),
        url: result.url,
        score: result.overallScore,
        grade: result.overallGrade,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AISuggestions;

    if (!data.summary && (!data.quickWins || data.quickWins.length === 0)) {
      return null;
    }

    return data;
  } catch (err) {
    // AI unavailable — fail silently, UI shows findings without AI
    if (import.meta.env?.DEV) console.error('AI fetch failed:', err);
    return null;
  }
}
