import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ContentAnalyzer } from '../../../src/analyzers/content/content.analyzer';
import type { AnalysisInput } from '../../../src/analyzers/base/analyzer.interface';

const goodHtml = readFileSync(join(__dirname, '../mocks/html-good.html'), 'utf-8');
const badHtml = readFileSync(join(__dirname, '../mocks/html-bad.html'), 'utf-8');
const minimalHtml = readFileSync(join(__dirname, '../mocks/html-minimal.html'), 'utf-8');

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

describe('ContentAnalyzer', () => {
  const analyzer = new ContentAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('content');
    expect(analyzer.weight).toBe(15);
  });

  describe('with good HTML', () => {
    it('should score reasonably', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('should count words', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.wordCount).toBeGreaterThan(20);
    });

    it('should detect all images have alt', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.images.withoutAlt).toBe(0);
    });

    it('should detect social links', async () => {
      // Good HTML doesn't have social links by default
      const result = await analyzer.analyze(createInput());
      expect(result.data.hasSocialLinks).toBe(false);
    });

    it('should detect contact info (email in footer)', async () => {
      const htmlWithEmail = goodHtml + '<a href="mailto:test@example.com">Contact</a>';
      const result = await analyzer.analyze(createInput({ html: htmlWithEmail }));
      expect(result.data.hasContactInfo).toBe(true);
    });
  });

  describe('with bad HTML', () => {
    it('should flag images without alt', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'content-images-no-alt');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag generic alt text', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'content-images-generic-alt');
      expect(f).toBeDefined();
    });
  });

  describe('with minimal HTML', () => {
    it('should flag low word count', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const f = result.findings.find((f) => f.id === 'content-low-word-count');
      expect(f).toBeDefined();
    });

    it('should flag no CTA', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const f = result.findings.find((f) => f.id === 'content-no-cta');
      expect(f).toBeDefined();
    });

    it('should flag no favicon', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const f = result.findings.find((f) => f.id === 'content-no-favicon');
      expect(f).toBeDefined();
    });
  });

  describe('CTA detection', () => {
    it('should detect CTA buttons', async () => {
      const html = '<html><body><a href="/signup">Sign Up Now</a><button>Get Started</button></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.ctas.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('readability', () => {
    it('should calculate readability score', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.data.readabilityScore).toBeLessThanOrEqual(100);
      expect(['easy', 'moderate', 'difficult']).toContain(result.data.readabilityLevel);
    });
  });
});
