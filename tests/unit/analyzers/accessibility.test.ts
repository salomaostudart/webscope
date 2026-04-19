import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccessibilityAnalyzer } from '../../../src/analyzers/accessibility/accessibility.analyzer';
import type { AnalysisInput } from '../../../src/analyzers/base/analyzer.interface';
import lighthouseGood from '../mocks/lighthouse-good.json';

const goodHtml = readFileSync(join(__dirname, '../mocks/html-good.html'), 'utf-8');
const badHtml = readFileSync(join(__dirname, '../mocks/html-bad.html'), 'utf-8');

function createInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    url: 'https://example.com',
    html: goodHtml,
    headers: {},
    statusCode: 200,
    redirectChain: [],
    responseTime: 500,
    ...overrides,
  };
}

describe('AccessibilityAnalyzer', () => {
  const analyzer = new AccessibilityAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('accessibility');
    expect(analyzer.weight).toBe(15);
    expect(analyzer.displayName).toBe('Accessibility');
  });

  describe('with good HTML + good Lighthouse', () => {
    it('should score high', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
      });
      const result = await analyzer.analyze(input);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe('A');
    });

    it('should detect language attribute', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
      });
      const result = await analyzer.analyze(input);
      expect(result.data.languageSet).toBe(true);
    });

    it('should detect landmarks', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
      });
      const result = await analyzer.analyze(input);
      expect(result.data.landmarksPresent).toContain('main');
      expect(result.data.landmarksPresent).toContain('nav');
      expect(result.data.landmarksPresent).toContain('header');
      expect(result.data.landmarksPresent).toContain('footer');
    });

    it('should have no images without alt', async () => {
      const input = createInput({
        lighthouse: lighthouseGood as AnalysisInput['lighthouse'],
      });
      const result = await analyzer.analyze(input);
      expect(result.data.imagesWithoutAlt).toBe(0);
    });
  });

  describe('with bad HTML', () => {
    it('should flag missing language', async () => {
      const input = createInput({ html: badHtml });
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-missing-lang');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag images without alt', async () => {
      const input = createInput({ html: badHtml });
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-images-no-alt');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag missing landmarks', async () => {
      const input = createInput({ html: badHtml });
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-missing-landmarks');
      expect(f).toBeDefined();
      expect(result.data.landmarksMissing.length).toBeGreaterThan(0);
    });

    it('should score lower than good HTML', async () => {
      const goodResult = await analyzer.analyze(createInput());
      const badResult = await analyzer.analyze(createInput({ html: badHtml }));
      expect(badResult.score).toBeLessThan(goodResult.score);
    });
  });

  describe('without Lighthouse data', () => {
    it('should still analyze HTML-based checks', async () => {
      const input = createInput({ lighthouse: undefined });
      const result = await analyzer.analyze(input);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.data.languageSet).toBe(true);
    });

    it('should have info finding about missing Lighthouse', async () => {
      const input = createInput({ lighthouse: undefined });
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-no-lighthouse');
      expect(f).toBeDefined();
    });
  });

  describe('skip navigation', () => {
    it('should flag missing skip nav', async () => {
      const input = createInput();
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-no-skip-nav');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('info');
    });

    it('should not flag when skip nav present', async () => {
      const htmlWithSkip = goodHtml.replace(
        '<nav>',
        '<a href="#main" class="sr-only">Skip to main content</a><nav>',
      );
      const input = createInput({ html: htmlWithSkip });
      const result = await analyzer.analyze(input);
      const f = result.findings.find((f) => f.id === 'a11y-no-skip-nav');
      expect(f).toBeUndefined();
    });
  });

  it('should include duration', async () => {
    const result = await analyzer.analyze(createInput());
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});
