import { scoreToGrade } from '../../utils/scoring';
import type {
  AnalysisInput,
  AnalyzerResult,
  Finding,
  IAnalyzer,
  LighthouseAudit,
} from '../base/analyzer.interface';
import type { CLSRating, MetricRating, PerformanceData } from './performance.types';

export class PerformanceAnalyzer implements IAnalyzer<PerformanceData> {
  readonly name = 'performance' as const;
  readonly displayName = 'Performance';
  readonly description = 'Core Web Vitals, page speed, resource optimization';
  readonly weight = 20;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<PerformanceData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const lh = input.lighthouse;

    const perfScore =
      lh?.categories?.performance?.score != null
        ? Math.round(lh.categories.performance.score * 100)
        : 0;

    // Extract Core Web Vitals
    const lcp = this.extractMetric(lh?.audits?.['largest-contentful-paint'], 'ms');
    const inp = this.extractMetric(lh?.audits?.['interaction-to-next-paint'], 'ms');
    const cls = this.extractCLS(lh?.audits?.['cumulative-layout-shift']);
    const fcp = this.extractMetric(lh?.audits?.['first-contentful-paint'], 'ms');
    const si = this.extractMetric(lh?.audits?.['speed-index'], 'ms');
    const tti = this.extractMetric(lh?.audits?.interactive, 'ms');
    const tbt = this.extractMetric(lh?.audits?.['total-blocking-time'], 'ms');

    // Generate findings from CWV
    if (!lh) {
      findings.push(
        this.finding(
          'perf-no-lighthouse',
          'Lighthouse',
          'Lighthouse data unavailable',
          'Performance analysis requires Lighthouse data from PageSpeed Insights API.',
          'Ensure PageSpeed Insights API is accessible and the URL is publicly reachable.',
          'info',
          'low',
          'quick-fix',
        ),
      );
    } else {
      // LCP
      if (lcp.value > 4000) {
        findings.push(
          this.finding(
            'perf-lcp-slow',
            'Core Web Vitals',
            'LCP above 4 seconds',
            `Largest Contentful Paint is ${(lcp.value / 1000).toFixed(1)}s, well above the 2.5s threshold.`,
            'Optimize the largest element: compress images, preload critical resources, reduce server response time.',
            'critical',
            'high',
            'moderate',
            undefined,
            `${(lcp.value / 1000).toFixed(1)}s`,
            '< 2.5s',
          ),
        );
      } else if (lcp.value > 2500) {
        findings.push(
          this.finding(
            'perf-lcp-needs-work',
            'Core Web Vitals',
            'LCP needs improvement',
            `LCP is ${(lcp.value / 1000).toFixed(1)}s, between 2.5s and 4s.`,
            'Optimize images, use preload for LCP element, consider lazy loading below-fold content.',
            'warning',
            'high',
            'moderate',
            undefined,
            `${(lcp.value / 1000).toFixed(1)}s`,
            '< 2.5s',
          ),
        );
      } else {
        findings.push(
          this.finding(
            'perf-lcp-good',
            'Core Web Vitals',
            'LCP is good',
            `LCP is ${(lcp.value / 1000).toFixed(1)}s, within the recommended threshold.`,
            'Keep optimizing to maintain this score.',
            'pass',
            'high',
            'quick-fix',
          ),
        );
      }

      // CLS
      if (cls.value > 0.25) {
        findings.push(
          this.finding(
            'perf-cls-high',
            'Core Web Vitals',
            'Excessive layout shift',
            `CLS is ${cls.value.toFixed(3)}, well above the 0.1 threshold.`,
            'Add explicit width/height to images and videos. Avoid inserting content above existing content.',
            'critical',
            'high',
            'moderate',
            undefined,
            cls.value.toFixed(3),
            '< 0.1',
          ),
        );
      } else if (cls.value > 0.1) {
        findings.push(
          this.finding(
            'perf-cls-moderate',
            'Core Web Vitals',
            'Moderate layout shift',
            `CLS is ${cls.value.toFixed(3)}, between 0.1 and 0.25.`,
            'Set dimensions on images/ads, use font-display: swap, avoid dynamic content injection.',
            'warning',
            'medium',
            'moderate',
            undefined,
            cls.value.toFixed(3),
            '< 0.1',
          ),
        );
      }

      // INP
      if (inp.value > 500) {
        findings.push(
          this.finding(
            'perf-inp-slow',
            'Core Web Vitals',
            'Slow interactivity',
            `INP is ${inp.value}ms, above the 500ms threshold.`,
            'Break up long tasks, defer non-critical JavaScript, optimize event handlers.',
            'critical',
            'high',
            'complex',
            undefined,
            `${inp.value}ms`,
            '< 200ms',
          ),
        );
      } else if (inp.value > 200) {
        findings.push(
          this.finding(
            'perf-inp-needs-work',
            'Core Web Vitals',
            'INP needs improvement',
            `INP is ${inp.value}ms, between 200ms and 500ms.`,
            'Optimize JavaScript execution, use requestIdleCallback for non-critical work.',
            'warning',
            'medium',
            'moderate',
            undefined,
            `${inp.value}ms`,
            '< 200ms',
          ),
        );
      }

      // FCP
      if (fcp.value > 3000) {
        findings.push(
          this.finding(
            'perf-fcp-slow',
            'Loading',
            'Slow first paint',
            `FCP is ${(fcp.value / 1000).toFixed(1)}s, above 3s.`,
            'Reduce server response time, eliminate render-blocking resources, use preconnect.',
            'warning',
            'medium',
            'moderate',
            undefined,
            `${(fcp.value / 1000).toFixed(1)}s`,
            '< 1.8s',
          ),
        );
      }

      // TBT
      if (tbt.value > 600) {
        findings.push(
          this.finding(
            'perf-tbt-high',
            'Loading',
            'High Total Blocking Time',
            `TBT is ${tbt.value}ms, above the 600ms threshold.`,
            'Break up long JavaScript tasks, defer non-critical scripts, reduce third-party impact.',
            'warning',
            'medium',
            'complex',
            undefined,
            `${tbt.value}ms`,
            '< 200ms',
          ),
        );
      }
    }

    // Page weight (from HTML size estimate)
    const pageWeight = this.extractPageWeight(lh);
    if (pageWeight.total > 5 * 1024 * 1024) {
      findings.push(
        this.finding(
          'perf-page-size-large',
          'Resources',
          'Page is very heavy',
          `Total page size is ${(pageWeight.total / 1024 / 1024).toFixed(1)}MB.`,
          'Compress images, minify CSS/JS, remove unused code, enable gzip/brotli.',
          'warning',
          'medium',
          'moderate',
          undefined,
          `${(pageWeight.total / 1024 / 1024).toFixed(1)}MB`,
          '< 3MB',
        ),
      );
    } else if (pageWeight.total > 3 * 1024 * 1024) {
      findings.push(
        this.finding(
          'perf-page-size-moderate',
          'Resources',
          'Page is moderately heavy',
          `Total page size is ${(pageWeight.total / 1024 / 1024).toFixed(1)}MB.`,
          'Consider optimizing images and removing unused CSS/JS.',
          'info',
          'low',
          'moderate',
          undefined,
          `${(pageWeight.total / 1024 / 1024).toFixed(1)}MB`,
          '< 3MB',
        ),
      );
    }

    // Request count
    const requestCount = this.extractRequestCount(lh);
    if (requestCount > 100) {
      findings.push(
        this.finding(
          'perf-too-many-requests',
          'Resources',
          'Too many HTTP requests',
          `Page makes ${requestCount} requests.`,
          'Bundle CSS/JS, use sprites or icon fonts, lazy load below-fold resources.',
          'warning',
          'medium',
          'moderate',
          undefined,
          `${requestCount}`,
          '< 50',
        ),
      );
    }

    // Compression
    const hasCompression = input.headers['content-encoding'];
    if (!hasCompression) {
      findings.push(
        this.finding(
          'perf-no-compression',
          'Resources',
          'No gzip/brotli compression',
          'Response does not have Content-Encoding header.',
          'Enable gzip or brotli compression on your server/CDN.',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // Opportunities from Lighthouse
    const opportunities = this.extractOpportunities(lh);
    const diagnostics = this.extractDiagnostics(lh);

    const data: PerformanceData = {
      scores: { performance: perfScore, lcp, inp, cls, fcp, si, tti, tbt },
      pageWeight,
      requestCount,
      opportunities,
      diagnostics,
    };

    const score = lh ? perfScore : 0;

    return {
      analyzer: this.name,
      score,
      grade: scoreToGrade(score),
      findings,
      data,
      duration: Date.now() - start,
    };
  }

  private extractMetric(audit: LighthouseAudit | undefined, unit: 'ms' | 's'): MetricRating {
    const value = audit?.numericValue ?? 0;
    const score = audit?.score ?? 0;
    const rating = score >= 0.9 ? 'good' : score >= 0.5 ? 'needs-improvement' : 'poor';
    return { value: Math.round(value), unit, rating } as MetricRating;
  }

  private extractCLS(audit: LighthouseAudit | undefined): CLSRating {
    const value = audit?.numericValue ?? 0;
    const rating = value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor';
    return { value, rating };
  }

  private extractPageWeight(lh: AnalysisInput['lighthouse']): PerformanceData['pageWeight'] {
    const resourceSummary = lh?.audits?.['resource-summary']?.details?.items;
    const empty = { total: 0, html: 0, css: 0, js: 0, images: 0, fonts: 0, other: 0 };

    if (!resourceSummary || !Array.isArray(resourceSummary)) return empty;

    const weight = { ...empty };
    for (const item of resourceSummary) {
      const size = (item.transferSize as number) || 0;
      const type = item.resourceType as string;
      weight.total += size;
      if (type === 'document') weight.html += size;
      else if (type === 'stylesheet') weight.css += size;
      else if (type === 'script') weight.js += size;
      else if (type === 'image') weight.images += size;
      else if (type === 'font') weight.fonts += size;
      else weight.other += size;
    }
    return weight;
  }

  private extractRequestCount(lh: AnalysisInput['lighthouse']): number {
    const summary = lh?.audits?.['resource-summary']?.details?.items;
    if (!summary || !Array.isArray(summary)) return 0;
    return summary.reduce((sum, item) => sum + ((item.requestCount as number) || 0), 0);
  }

  private extractOpportunities(lh: AnalysisInput['lighthouse']): PerformanceData['opportunities'] {
    if (!lh?.audits) return [];
    return Object.values(lh.audits)
      .filter((a) => a.details?.overallSavingsMs && a.details.overallSavingsMs > 100)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        savings:
          a.displayValue || `${Math.round(a.details?.overallSavingsMs!)}ms potential savings`,
      }))
      .slice(0, 10);
  }

  private extractDiagnostics(lh: AnalysisInput['lighthouse']): PerformanceData['diagnostics'] {
    if (!lh?.audits) return [];
    const diagIds = [
      'dom-size',
      'font-display',
      'third-party-summary',
      'bootup-time',
      'mainthread-work-breakdown',
    ];
    return diagIds
      .map((id) => lh.audits[id])
      .filter((a): a is NonNullable<typeof a> => !!a && a.score !== null && a.score < 0.9)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.displayValue || a.description,
      }));
  }

  private finding(
    id: string,
    category: string,
    title: string,
    description: string,
    recommendation: string,
    severity: Finding['severity'],
    impact: Finding['impact'],
    effort: Finding['effort'],
    element?: string,
    value?: string,
    expected?: string,
  ): Finding {
    return {
      id,
      analyzer: this.name,
      severity,
      category,
      title,
      description,
      recommendation,
      impact,
      effort,
      element,
      value,
      expected,
    };
  }
}
