/**
 * Core interfaces for the WebScope Analyzer Pattern.
 * Every analyzer implements IAnalyzer<T> and returns AnalyzerResult<T>.
 */

export type AnalyzerName =
  | 'performance'
  | 'seo'
  | 'accessibility'
  | 'content'
  | 'branding'
  | 'security';

export type Severity = 'critical' | 'warning' | 'info' | 'pass';
export type Impact = 'high' | 'medium' | 'low';
export type Effort = 'quick-fix' | 'moderate' | 'complex';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AnalysisInput {
  url: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  redirectChain: string[];
  responseTime: number;
  lighthouse?: LighthouseResult;
}

export interface LighthouseResult {
  categories: {
    performance?: { score: number | null };
    accessibility?: { score: number | null };
    seo?: { score: number | null };
    'best-practices'?: { score: number | null };
  };
  audits: Record<string, LighthouseAudit>;
}

export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  details?: {
    type: string;
    items?: Array<Record<string, unknown>>;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  };
}

export interface Finding {
  id: string;
  analyzer: AnalyzerName;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  impact: Impact;
  effort: Effort;
  element?: string;
  value?: string;
  expected?: string;
  learnMoreUrl?: string;
}

export interface AnalyzerResult<T = unknown> {
  analyzer: AnalyzerName;
  score: number;
  grade: Grade;
  findings: Finding[];
  data: T;
  duration: number;
}

export interface IAnalyzer<T = unknown> {
  readonly name: AnalyzerName;
  readonly displayName: string;
  readonly description: string;
  readonly weight: number;
  analyze(input: AnalysisInput): Promise<AnalyzerResult<T>>;
}

export interface AuditResult {
  url: string;
  overallScore: number;
  overallGrade: Grade;
  results: AnalyzerResult[];
  allFindings: Finding[];
  analyzedAt: string;
}
