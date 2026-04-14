import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BrandingAnalyzer } from '../../../src/analyzers/branding/branding.analyzer';
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

describe('BrandingAnalyzer', () => {
  const analyzer = new BrandingAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('branding');
    expect(analyzer.weight).toBe(10);
    expect(analyzer.displayName).toBe('Branding');
  });

  describe('with good HTML', () => {
    it('should detect favicon', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.favicon.found).toBe(true);
      expect(result.data.favicon.type).toBe('svg');
    });

    it('should detect OG image', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.ogImage).toContain('coffee-portland.jpg');
    });

    it('should score reasonably', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('with bad HTML', () => {
    it('should flag missing favicon', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'brand-no-favicon');
      expect(f).toBeDefined();
    });

    it('should flag missing OG image', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'brand-no-og-image');
      expect(f).toBeDefined();
    });

    it('should flag missing logo', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'brand-no-logo');
      expect(f).toBeDefined();
    });

    it('should score lower than good HTML', async () => {
      const goodResult = await analyzer.analyze(createInput());
      const badResult = await analyzer.analyze(createInput({ html: badHtml }));
      expect(badResult.score).toBeLessThan(goodResult.score);
    });
  });

  describe('with minimal HTML', () => {
    it('should flag many missing brand elements', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      expect(result.findings.length).toBeGreaterThanOrEqual(4);
    });

    it('should score low', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      expect(result.score).toBeLessThan(70);
    });
  });

  describe('color extraction', () => {
    it('should extract hex colors', async () => {
      const html = '<html><body><style>body { color: #ff5500; background: #818cf8; }</style></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.colors.totalUnique).toBeGreaterThanOrEqual(2);
    });

    it('should filter grayscale colors', async () => {
      const html = '<html><body><style>body { color: #333333; background: #ffffff; border: 1px solid #cccccc; }</style></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      // Grayscale colors should be filtered out
      expect(result.data.colors.totalUnique).toBe(0);
    });
  });

  describe('font extraction', () => {
    it('should detect Google Fonts', async () => {
      const html = '<html><head><link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=Inter:wght@400;500&display=swap" rel="stylesheet"></head><body></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.fonts.families.some((f) => f.name === 'Oswald')).toBe(true);
      expect(result.data.fonts.families.some((f) => f.name === 'Inter')).toBe(true);
      expect(result.data.fonts.hasDisplaySwap).toBe(true);
    });
  });

  describe('logo detection', () => {
    it('should detect img with logo in src', async () => {
      const html = '<html><body><header><img src="/images/logo.png" alt="Company"></header><main></main></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.logo.found).toBe(true);
      expect(result.data.logo.inHeader).toBe(true);
    });

    it('should detect SVG in header as logo', async () => {
      const html = '<html><body><header><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></header><main></main></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.logo.found).toBe(true);
    });
  });

  describe('manifest', () => {
    it('should detect manifest link', async () => {
      const html = '<html><head><link rel="manifest" href="/manifest.json"></head><body></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.manifest.found).toBe(true);
    });

    it('should flag missing manifest', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const f = result.findings.find((f) => f.id === 'brand-no-manifest');
      expect(f).toBeDefined();
    });
  });

  describe('theme color', () => {
    it('should detect theme-color meta', async () => {
      const html = '<html><head><meta name="theme-color" content="#818cf8"></head><body></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      expect(result.data.themeColor).toBe('#818cf8');
    });

    it('should flag missing theme-color', async () => {
      const result = await analyzer.analyze(createInput({ html: minimalHtml }));
      const f = result.findings.find((f) => f.id === 'brand-no-theme-color');
      expect(f).toBeDefined();
    });
  });
});
