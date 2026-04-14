import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SEOAnalyzer } from '../../../src/analyzers/seo/seo.analyzer';
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

describe('SEOAnalyzer', () => {
  const analyzer = new SEOAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('seo');
    expect(analyzer.weight).toBe(25);
  });

  describe('with good HTML', () => {
    it('should score high', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.grade).toMatch(/^[AB]$/);
    });

    it('should have no critical findings', async () => {
      const result = await analyzer.analyze(createInput());
      const criticals = result.findings.filter((f) => f.severity === 'critical');
      expect(criticals).toHaveLength(0);
    });

    it('should extract title correctly', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.title.value).toContain('Coffee Shops');
      expect(result.data.title.isOptimal).toBe(true);
    });

    it('should extract meta description correctly', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.metaDescription.value).toContain('top 15 coffee');
      expect(result.data.metaDescription.isOptimal).toBe(true);
    });

    it('should detect structured data', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.structuredData.length).toBe(1);
      expect(result.data.structuredData[0].type).toBe('Article');
    });

    it('should detect Open Graph tags', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.openGraph['og:title']).toBe('Best Coffee Shops in Portland');
    });

    it('should detect all images have alt', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.images.withoutAlt).toBe(0);
    });
  });

  describe('with bad HTML', () => {
    it('should score low', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      expect(result.score).toBeLessThan(60);
    });

    it('should flag missing title', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-missing-title');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag missing meta description', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-missing-meta-description');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag multiple H1s', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-multiple-h1');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('warning');
    });

    it('should flag broken heading hierarchy', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-heading-hierarchy');
      expect(f).toBeDefined();
    });

    it('should flag images without alt', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-images-without-alt');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag images with generic alt', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-images-generic-alt');
      expect(f).toBeDefined();
    });

    it('should flag missing viewport', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-missing-viewport');
      expect(f).toBeDefined();
    });

    it('should flag missing language', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-missing-language');
      expect(f).toBeDefined();
    });

    it('should flag missing canonical', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-missing-canonical');
      expect(f).toBeDefined();
    });

    it('should flag non-descriptive links', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'seo-links-no-text');
      expect(f).toBeDefined();
    });
  });

  describe('with minimal HTML', () => {
    it('should score very low', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      expect(result.score).toBeLessThan(50);
      expect(result.grade).toBe('F');
    });

    it('should have multiple critical findings', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const criticals = result.findings.filter((f) => f.severity === 'critical');
      expect(criticals.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('HTTPS check', () => {
    it('should flag HTTP URL', async () => {
      const result = await analyzer.analyze(createInput({ url: 'http://example.com' }));
      const f = result.findings.find((f) => f.id === 'seo-no-https');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should not flag HTTPS URL', async () => {
      const result = await analyzer.analyze(createInput({ url: 'https://example.com' }));
      const f = result.findings.find((f) => f.id === 'seo-no-https');
      expect(f).toBeUndefined();
    });
  });
});
