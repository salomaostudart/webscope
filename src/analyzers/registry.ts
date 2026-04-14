import type { IAnalyzer, AnalysisInput, AuditResult, Finding } from './base/analyzer.interface';
import { scoreToGrade, sortBySeverity } from '../utils/scoring';
import { PerformanceAnalyzer } from './performance/performance.analyzer';
import { SEOAnalyzer } from './seo/seo.analyzer';

export const analyzers: IAnalyzer[] = [
  new PerformanceAnalyzer(),
  new SEOAnalyzer(),
  // Future: AccessibilityAnalyzer, ContentAnalyzer, BrandingAnalyzer, SecurityAnalyzer
];

export async function runFullAudit(input: AnalysisInput): Promise<AuditResult> {
  const results = await Promise.all(
    analyzers.map((a) => a.analyze(input)),
  );

  const overallScore = results.reduce(
    (sum, r) => {
      const analyzer = analyzers.find((a) => a.name === r.analyzer);
      return sum + (r.score * (analyzer?.weight ?? 0)) / 100;
    },
    0,
  );

  // With only some analyzers active, normalize score to active weight
  const activeWeight = analyzers.reduce((sum, a) => sum + a.weight, 0);
  const normalizedScore = activeWeight > 0
    ? Math.round((overallScore / activeWeight) * 100)
    : 0;

  return {
    url: input.url,
    overallScore: normalizedScore,
    overallGrade: scoreToGrade(normalizedScore),
    results,
    allFindings: sortBySeverity(results.flatMap((r) => r.findings)) as Finding[],
    analyzedAt: new Date().toISOString(),
  };
}
