/**
 * Types specific to the Performance Analyzer.
 */

export interface MetricRating {
  value: number;
  unit: 'ms' | 's';
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface CLSRating {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PerformanceData {
  scores: {
    performance: number;
    lcp: MetricRating;
    inp: MetricRating;
    cls: CLSRating;
    fcp: MetricRating;
    si: MetricRating;
    tti: MetricRating;
    tbt: MetricRating;
  };
  pageWeight: {
    total: number;
    html: number;
    css: number;
    js: number;
    images: number;
    fonts: number;
    other: number;
  };
  requestCount: number;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings: string;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}
