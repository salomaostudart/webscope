/**
 * Scanner — orchestrates Worker proxy + PSI API + all analyzers.
 * Runs entirely in the browser (client-side).
 */

import type { AnalysisInput, AuditResult } from '../analyzers/base/analyzer.interface';
import { runFullAudit } from '../analyzers/registry';
import { fetchLighthouse } from './psi';
import { fetchViaWorker } from './worker';

export type ScanPhase =
  | 'fetching' // Fetching page via Worker proxy
  | 'lighthouse' // Running Lighthouse via PSI API
  | 'analyzing' // Running 6 analyzers
  | 'complete' // Done
  | 'error'; // Failed

export interface ScanProgress {
  phase: ScanPhase;
  message: string;
}

export async function scanUrl(
  url: string,
  onProgress?: (progress: ScanProgress) => void,
): Promise<AuditResult> {
  onProgress?.({ phase: 'fetching', message: 'Fetching page...' });

  // 1. Fetch HTML + headers via Worker proxy, and Lighthouse in parallel
  const [workerResult, psiResult] = await Promise.all([
    fetchViaWorker(url),
    (async () => {
      onProgress?.({ phase: 'lighthouse', message: 'Running Lighthouse analysis...' });
      try {
        return await fetchLighthouse(url);
      } catch (err) {
        // PSI can fail (timeout, rate limit) — continue without Lighthouse
        if (import.meta.env?.DEV) console.error('AI fetch failed:', err);
        return null;
      }
    })(),
  ]);

  onProgress?.({ phase: 'analyzing', message: 'Analyzing 6 categories...' });

  // 2. Build input for analyzers
  const input: AnalysisInput = {
    url: workerResult.url,
    html: workerResult.html,
    headers: workerResult.headers,
    statusCode: workerResult.statusCode,
    redirectChain: [],
    responseTime: workerResult.responseTime,
    lighthouse: psiResult?.lighthouseResult,
  };

  // 3. Run all 6 analyzers in parallel
  const result = await runFullAudit(input);

  onProgress?.({ phase: 'complete', message: 'Analysis complete!' });

  return result;
}
