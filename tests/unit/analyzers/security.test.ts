import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SecurityAnalyzer } from '../../../src/analyzers/security/security.analyzer';
import type { AnalysisInput } from '../../../src/analyzers/base/analyzer.interface';

const goodHtml = readFileSync(join(__dirname, '../mocks/html-good.html'), 'utf-8');
const badHtml = readFileSync(join(__dirname, '../mocks/html-bad.html'), 'utf-8');

const goodHeaders: Record<string, string> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'content-security-policy': "default-src 'self'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

const badHeaders: Record<string, string> = {
  'server': 'Apache/2.4.51 (Ubuntu)',
  'x-powered-by': 'Express 4.18.2',
};

function createInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    url: 'https://example.com',
    html: goodHtml,
    headers: goodHeaders,
    statusCode: 200,
    redirectChain: [],
    responseTime: 500,
    ...overrides,
  };
}

describe('SecurityAnalyzer', () => {
  const analyzer = new SecurityAnalyzer();

  it('should have correct metadata', () => {
    expect(analyzer.name).toBe('security');
    expect(analyzer.weight).toBe(15);
  });

  describe('with all security headers', () => {
    it('should score A', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe('A');
    });

    it('should have no critical findings', async () => {
      const result = await analyzer.analyze(createInput());
      const criticals = result.findings.filter((f) => f.severity === 'critical');
      expect(criticals).toHaveLength(0);
    });

    it('should parse HSTS correctly', async () => {
      const result = await analyzer.analyze(createInput());
      expect(result.data.headers.hsts.present).toBe(true);
      expect(result.data.headers.hsts.maxAge).toBe(31536000);
      expect(result.data.headers.hsts.includeSubDomains).toBe(true);
      expect(result.data.headers.hsts.preload).toBe(true);
    });
  });

  describe('with no security headers', () => {
    it('should score low', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      expect(result.score).toBeLessThan(60);
    });

    it('should flag missing HSTS', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-missing-hsts');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });

    it('should flag missing CSP', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-missing-csp');
      expect(f).toBeDefined();
    });

    it('should flag missing X-Frame-Options', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-missing-xfo');
      expect(f).toBeDefined();
    });

    it('should flag missing X-Content-Type-Options', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-missing-xcto');
      expect(f).toBeDefined();
    });

    it('should flag server version leakage', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-server-leaks');
      expect(f).toBeDefined();
    });

    it('should flag X-Powered-By', async () => {
      const result = await analyzer.analyze(createInput({ headers: badHeaders }));
      const f = result.findings.find((f) => f.id === 'sec-x-powered-by');
      expect(f).toBeDefined();
    });
  });

  describe('HTTPS check', () => {
    it('should flag HTTP URL', async () => {
      const result = await analyzer.analyze(createInput({ url: 'http://example.com' }));
      const f = result.findings.find((f) => f.id === 'sec-no-https');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });
  });

  describe('mixed content', () => {
    it('should detect HTTP resources on HTTPS page', async () => {
      const result = await analyzer.analyze(createInput({ html: badHtml }));
      const f = result.findings.find((f) => f.id === 'sec-mixed-content');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
      expect(result.data.mixedContent.resources.length).toBeGreaterThan(0);
    });

    it('should not flag on HTTP page', async () => {
      const result = await analyzer.analyze(createInput({ url: 'http://example.com', html: badHtml }));
      // Mixed content only applies to HTTPS pages
      expect(result.data.mixedContent.found).toBe(false);
    });
  });

  describe('CSP unsafe directives', () => {
    it('should flag unsafe-inline in script-src', async () => {
      const headers = {
        ...goodHeaders,
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      };
      const result = await analyzer.analyze(createInput({ headers }));
      const f = result.findings.find((f) => f.id === 'sec-csp-unsafe-inline');
      expect(f).toBeDefined();
    });

    it('should flag unsafe-eval', async () => {
      const headers = {
        ...goodHeaders,
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-eval'",
      };
      const result = await analyzer.analyze(createInput({ headers }));
      const f = result.findings.find((f) => f.id === 'sec-csp-unsafe-eval');
      expect(f).toBeDefined();
    });
  });

  describe('insecure forms', () => {
    it('should flag form with HTTP action', async () => {
      const html = '<html><body><form action="http://evil.com/submit"><input type="text"></form></body></html>';
      const result = await analyzer.analyze(createInput({ html }));
      const f = result.findings.find((f) => f.id === 'sec-insecure-form');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('critical');
    });
  });

  describe('HSTS max-age', () => {
    it('should flag short max-age', async () => {
      const headers = { ...goodHeaders, 'strict-transport-security': 'max-age=3600' };
      const result = await analyzer.analyze(createInput({ headers }));
      const f = result.findings.find((f) => f.id === 'sec-hsts-short');
      expect(f).toBeDefined();
      expect(f?.severity).toBe('warning');
    });
  });
});
