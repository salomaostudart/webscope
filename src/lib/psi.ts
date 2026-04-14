/**
 * PageSpeed Insights API client.
 * Free: 25,000 requests/day without API key.
 */

import type { LighthouseResult } from '../analyzers/base/analyzer.interface';

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface PSIResponse {
  lighthouseResult: LighthouseResult;
  loadingExperience?: {
    metrics: Record<string, { percentile: number; category: string }>;
  };
  analysisUTCTimestamp: string;
}

export async function fetchLighthouse(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PSIResponse> {
  const params = new URLSearchParams({
    url,
    strategy,
  });
  // Add multiple category params
  ['performance', 'accessibility', 'seo', 'best-practices'].forEach((cat) => {
    params.append('category', cat);
  });

  const response = await fetch(`${PSI_URL}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PageSpeed Insights API error (${response.status}): ${text.substring(0, 200)}`);
  }

  return response.json();
}
