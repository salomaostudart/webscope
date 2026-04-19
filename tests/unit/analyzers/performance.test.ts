import { describe, expect, it } from 'vitest';
import type { AnalysisInput } from '../../../src/analyzers/base/analyzer.interface';
import { PerformanceAnalyzer } from '../../../src/analyzers/performance/performance.analyzer';
import lighthouseBad from '../mocks/lighthouse-bad.json';
import lighthouseGood from '../mocks/lighthouse-good.json';

function createInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    url: 'https://example.com',
    html: '<html><body>Test</body></html>',
    headers: { 'content-encoding': 'gzip' },
    statusCode: 200,
    redirectChain: [],
    responseTime: 500,
    ...overrides,
  };
}

describe('PerformanceAnalyzer', () => {
  const analyzer = new PerformanceAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('performance');
    expect(analyzer.weight).toBe(20);
    expect(analyzer.displayName).toBe('Performance');
  });

  describe('with good Lighthouse data', () => {
    it('should score high (A grade)', async () => {
      const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      expect(result.score).toBe(95);
      expect(result.grade).toBe('A');
      expect(result.analyzer).toBe('performance');
    });

    it('should have no critical findings', async () => {
      const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const criticals = result.findings.filter((f) => f.severity === 'critical');
      expect(criticals).toHaveLength(0);
    });

    it('should have LCP pass finding', async () => {
      const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const lcpPass = result.findings.find((f) => f.id === 'perf-lcp-good');
      expect(lcpPass).toBeDefined();
      expect(lcpPass?.severity).toBe('pass');
    });

    it('should extract page weight correctly', async () => {
      const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      expect(result.data.pageWeight.html).toBe(15000);
      expect(result.data.pageWeight.css).toBe(25000);
      expect(result.data.pageWeight.js).toBe(80000);
      expect(result.data.pageWeight.images).toBe(120000);
      expect(result.data.pageWeight.fonts).toBe(40000);
    });

    it('should extract request count', async () => {
      const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      expect(result.data.requestCount).toBe(15);
    });
  });

  describe('with bad Lighthouse data', () => {
    it('should score low (F grade)', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      expect(result.score).toBe(32);
      expect(result.grade).toBe('F');
    });

    it('should have critical LCP finding', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const lcpSlow = result.findings.find((f) => f.id === 'perf-lcp-slow');
      expect(lcpSlow).toBeDefined();
      expect(lcpSlow?.severity).toBe('critical');
      expect(lcpSlow?.value).toContain('5.2');
    });

    it('should have critical CLS finding', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const clsHigh = result.findings.find((f) => f.id === 'perf-cls-high');
      expect(clsHigh).toBeDefined();
      expect(clsHigh?.severity).toBe('critical');
    });

    it('should have critical INP finding', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const inpSlow = result.findings.find((f) => f.id === 'perf-inp-slow');
      expect(inpSlow).toBeDefined();
      expect(inpSlow?.severity).toBe('critical');
    });

    it('should have FCP warning', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const fcpSlow = result.findings.find((f) => f.id === 'perf-fcp-slow');
      expect(fcpSlow).toBeDefined();
      expect(fcpSlow?.severity).toBe('warning');
    });

    it('should have TBT warning', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const tbtHigh = result.findings.find((f) => f.id === 'perf-tbt-high');
      expect(tbtHigh).toBeDefined();
      expect(tbtHigh?.severity).toBe('warning');
    });

    it('should flag large page size', async () => {
      const input = createInput({ lighthouse: lighthouseBad as AnalysisInput['lighthouse'] });
      const result = await analyzer.analyze(input);

      const pageSize = result.findings.find((f) => f.id === 'perf-page-size-large');
      expect(pageSize).toBeDefined();
    });
  });

  describe('without Lighthouse data', () => {
    it('should return score 0', async () => {
      const input = createInput({ lighthouse: undefined });
      const result = await analyzer.analyze(input);

      expect(result.score).toBe(0);
      expect(result.grade).toBe('F');
    });

    it('should have info finding about missing Lighthouse', async () => {
      const input = createInput({ lighthouse: undefined });
      const result = await analyzer.analyze(input);

      const noLh = result.findings.find((f) => f.id === 'perf-no-lighthouse');
      expect(noLh).toBeDefined();
      expect(noLh?.severity).toBe('info');
    });
  });

  describe('compression check', () => {
    it('should flag missing compression', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
        headers: {},
      });
      const result = await analyzer.analyze(input);

      const noCompression = result.findings.find((f) => f.id === 'perf-no-compression');
      expect(noCompression).toBeDefined();
      expect(noCompression?.severity).toBe('warning');
    });

    it('should not flag when compression present', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
        headers: { 'content-encoding': 'br' },
      });
      const result = await analyzer.analyze(input);

      const noCompression = result.findings.find((f) => f.id === 'perf-no-compression');
      expect(noCompression).toBeUndefined();
    });
  });

  it('should include duration in result', async () => {
    const input = createInput({ lighthouse: lighthouseGood as AnalysisInput['lighthouse'] });
    const result = await analyzer.analyze(input);

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeLessThan(1000);
  });
});
