/**
 * D1 database client — save and load audits via Worker API.
 */

import type { AuditResult } from '../analyzers/base/analyzer.interface';
import type { AISuggestions } from './ai';

const WORKER_URL =
  import.meta.env?.PUBLIC_WORKER_URL || 'https://webscope-api.salomaomstudart.workers.dev';

export interface SavedAudit {
  id: string;
  shareUrl: string;
}

export interface AuditSummary {
  id: string;
  url: string;
  domain: string;
  overall_score: number;
  overall_grade: string;
  created_at: string;
}

export async function saveAudit(
  result: AuditResult,
  ai?: AISuggestions | null,
): Promise<SavedAudit | null> {
  try {
    const response = await fetch(`${WORKER_URL}/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...result,
        aiSummary: ai?.summary,
        quickWins: ai?.quickWins,
      }),
    });

    if (!response.ok) return null;
    return response.json() as Promise<SavedAudit>;
  } catch (err) {
    if (import.meta.env?.DEV) console.error('AI fetch failed:', err);
    return null;
  }
}

export async function getAudit(id: string): Promise<any | null> {
  try {
    const response = await fetch(`${WORKER_URL}/audits/${id}`);
    if (!response.ok) return null;
    return response.json();
  } catch (err) {
    if (import.meta.env?.DEV) console.error('AI fetch failed:', err);
    return null;
  }
}

export interface AuditComparison {
  audit1: {
    id: string;
    url: string;
    score: number;
    grade: string;
    date: string;
    scores: Record<string, number>;
  };
  audit2: {
    id: string;
    url: string;
    score: number;
    grade: string;
    date: string;
    scores: Record<string, number>;
  };
  delta: { overall: number; categories: Record<string, number> };
  improved: boolean;
}

export async function compareAudits(id1: string, id2: string): Promise<AuditComparison | null> {
  try {
    const response = await fetch(`${WORKER_URL}/audits/compare?id1=${id1}&id2=${id2}`);
    if (!response.ok) return null;
    return response.json() as Promise<AuditComparison>;
  } catch {
    if (import.meta.env?.DEV) console.error('Compare failed');
    return null;
  }
}

export async function clearAllAudits(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/audits`, { method: 'DELETE' });
    return response.ok;
  } catch {
    if (import.meta.env?.DEV) console.error('Clear audits failed');
    return false;
  }
}

export async function listAudits(domain?: string, limit = 20): Promise<AuditSummary[]> {
  try {
    const params = new URLSearchParams();
    if (domain) params.set('domain', domain);
    params.set('limit', String(limit));
    const response = await fetch(`${WORKER_URL}/audits?${params}`);
    if (!response.ok) return [];
    return response.json() as Promise<AuditSummary[]>;
  } catch (err) {
    if (import.meta.env?.DEV) console.error('AI fetch failed:', err);
    return [];
  }
}
