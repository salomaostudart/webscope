import { scoreToGrade } from '../../utils/scoring';
import type { AnalysisInput, AnalyzerResult, Finding, IAnalyzer } from '../base/analyzer.interface';
import type { SecurityData } from './security.types';

export class SecurityAnalyzer implements IAnalyzer<SecurityData> {
  readonly name = 'security' as const;
  readonly displayName = 'Security';
  readonly description = 'HTTPS, headers, CSP, mixed content';
  readonly weight = 15;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<SecurityData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const { url, html, headers } = input;

    const https = url.startsWith('https://');
    const h = this.normalizeHeaders(headers);

    // --- HTTPS ---
    if (!https) {
      findings.push(
        this.f(
          'sec-no-https',
          'HTTPS',
          'Site not using HTTPS',
          'The URL uses HTTP instead of HTTPS.',
          'Migrate to HTTPS immediately — affects security and SEO.',
          'critical',
          'high',
          'moderate',
        ),
      );
    }

    // --- HSTS ---
    const hstsValue = h['strict-transport-security'];
    const hsts = this.parseHSTS(hstsValue);
    if (!hsts.present) {
      findings.push(
        this.f(
          'sec-missing-hsts',
          'Headers',
          'Missing HSTS header',
          'Strict-Transport-Security header is not set.',
          'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          'critical',
          'high',
          'quick-fix',
        ),
      );
    } else if (hsts.maxAge !== null && hsts.maxAge < 31536000) {
      findings.push(
        this.f(
          'sec-hsts-short',
          'Headers',
          'HSTS max-age too short',
          `HSTS max-age is ${hsts.maxAge}s (< 1 year).`,
          'Set max-age to at least 31536000 (1 year).',
          'warning',
          'medium',
          'quick-fix',
          undefined,
          `${hsts.maxAge}s`,
          '31536000s',
        ),
      );
    }

    // --- CSP ---
    const cspValue = h['content-security-policy'];
    const csp = this.parseCSP(cspValue);
    if (!csp.present) {
      findings.push(
        this.f(
          'sec-missing-csp',
          'Headers',
          'Missing Content-Security-Policy',
          'No CSP header found.',
          'Add a Content-Security-Policy header to prevent XSS and injection attacks.',
          'warning',
          'high',
          'moderate',
        ),
      );
    } else {
      if (csp.hasUnsafeInline) {
        findings.push(
          this.f(
            'sec-csp-unsafe-inline',
            'Headers',
            'CSP allows unsafe-inline scripts',
            "CSP script-src contains 'unsafe-inline'.",
            'Remove unsafe-inline and use nonces or hashes instead.',
            'warning',
            'high',
            'complex',
          ),
        );
      }
      if (csp.hasUnsafeEval) {
        findings.push(
          this.f(
            'sec-csp-unsafe-eval',
            'Headers',
            'CSP allows unsafe-eval',
            "CSP contains 'unsafe-eval'.",
            'Remove unsafe-eval — it enables arbitrary code execution.',
            'warning',
            'high',
            'complex',
          ),
        );
      }
    }

    // --- X-Frame-Options ---
    const xfo = h['x-frame-options'];
    if (!xfo) {
      findings.push(
        this.f(
          'sec-missing-xfo',
          'Headers',
          'Missing X-Frame-Options',
          'X-Frame-Options header is not set.',
          'Add: X-Frame-Options: DENY (or SAMEORIGIN).',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- X-Content-Type-Options ---
    if (!h['x-content-type-options']) {
      findings.push(
        this.f(
          'sec-missing-xcto',
          'Headers',
          'Missing X-Content-Type-Options',
          'X-Content-Type-Options header is not set.',
          'Add: X-Content-Type-Options: nosniff',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- Referrer-Policy ---
    if (!h['referrer-policy']) {
      findings.push(
        this.f(
          'sec-missing-referrer',
          'Headers',
          'Missing Referrer-Policy',
          'Referrer-Policy header is not set.',
          'Add: Referrer-Policy: strict-origin-when-cross-origin',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- Permissions-Policy ---
    if (!h['permissions-policy']) {
      findings.push(
        this.f(
          'sec-missing-permissions',
          'Headers',
          'Missing Permissions-Policy',
          'Permissions-Policy header is not set.',
          'Add: Permissions-Policy: camera=(), microphone=(), geolocation=()',
          'info',
          'low',
          'quick-fix',
        ),
      );
    }

    // --- Server header ---
    const serverHeader = h.server;
    const serverLeaks = !!serverHeader && /\d/.test(serverHeader);
    if (serverLeaks) {
      findings.push(
        this.f(
          'sec-server-leaks',
          'Headers',
          'Server header reveals version info',
          `Server header: "${serverHeader}".`,
          'Remove or genericize the Server header to not reveal software versions.',
          'info',
          'low',
          'quick-fix',
          undefined,
          serverHeader || '',
        ),
      );
    }

    // --- X-Powered-By ---
    const xPoweredBy = h['x-powered-by'];
    if (xPoweredBy) {
      findings.push(
        this.f(
          'sec-x-powered-by',
          'Headers',
          'X-Powered-By header exposes stack',
          `X-Powered-By: "${xPoweredBy}".`,
          'Remove the X-Powered-By header.',
          'info',
          'low',
          'quick-fix',
          undefined,
          xPoweredBy,
        ),
      );
    }

    // --- Mixed content ---
    const mixedResources = this.findMixedContent(html, https);
    if (mixedResources.length > 0) {
      findings.push(
        this.f(
          'sec-mixed-content',
          'Mixed Content',
          'HTTP resources on HTTPS page',
          `${mixedResources.length} resource(s) loaded over HTTP on an HTTPS page.`,
          'Change all resource URLs to HTTPS.',
          'critical',
          'high',
          'moderate',
        ),
      );
    }

    // --- SRI ---
    const sri = this.checkSRI(html);
    if (sri.without.length > 0) {
      findings.push(
        this.f(
          'sec-no-sri',
          'Integrity',
          'External scripts without SRI',
          `${sri.without.length} external script(s) lack Subresource Integrity.`,
          'Add integrity attribute to external scripts for tamper protection.',
          'info',
          'low',
          'moderate',
        ),
      );
    }

    // --- Forms with insecure action ---
    const forms = this.checkForms(html);
    if (forms.insecureAction.length > 0) {
      findings.push(
        this.f(
          'sec-insecure-form',
          'Forms',
          'Form submits to HTTP',
          `${forms.insecureAction.length} form(s) submit to an HTTP URL.`,
          'Change form action to HTTPS.',
          'critical',
          'high',
          'quick-fix',
        ),
      );
    }

    const score = this.calculateScore(findings);

    const data: SecurityData = {
      https,
      headers: {
        hsts,
        csp,
        xFrameOptions: { present: !!xfo, value: xfo || null },
        xContentTypeOptions: { present: !!h['x-content-type-options'] },
        referrerPolicy: { present: !!h['referrer-policy'], value: h['referrer-policy'] || null },
        permissionsPolicy: {
          present: !!h['permissions-policy'],
          value: h['permissions-policy'] || null,
        },
        server: { present: !!serverHeader, value: serverHeader || null, leaksInfo: serverLeaks },
        xPoweredBy: { present: !!xPoweredBy, value: xPoweredBy || null },
      },
      mixedContent: { found: mixedResources.length > 0, resources: mixedResources },
      sri,
      forms,
    };

    return {
      analyzer: this.name,
      score,
      grade: scoreToGrade(score),
      findings,
      data,
      duration: Date.now() - start,
    };
  }

  private calculateScore(findings: Finding[]): number {
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'critical') score -= 15;
      else if (f.severity === 'warning') score -= 8;
      else if (f.severity === 'info') score -= 2;
    }
    return Math.max(0, Math.min(100, score));
  }

  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  private parseHSTS(value: string | undefined): SecurityData['headers']['hsts'] {
    if (!value) return { present: false, maxAge: null, includeSubDomains: false, preload: false };
    const maxAgeMatch = value.match(/max-age=(\d+)/i);
    return {
      present: true,
      maxAge: maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : null,
      includeSubDomains: /includeSubDomains/i.test(value),
      preload: /preload/i.test(value),
    };
  }

  private parseCSP(value: string | undefined): SecurityData['headers']['csp'] {
    if (!value)
      return { present: false, value: null, hasUnsafeInline: false, hasUnsafeEval: false };
    return {
      present: true,
      value,
      hasUnsafeInline:
        value.includes("'unsafe-inline'") && /script-src[^;]*'unsafe-inline'/.test(value),
      hasUnsafeEval: value.includes("'unsafe-eval'"),
    };
  }

  private findMixedContent(html: string, isHttps: boolean): string[] {
    if (!isHttps) return [];
    const resources: string[] = [];
    const regex = /(?:src|href|action)=["'](http:\/\/[^"']+)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      resources.push(match[1]);
    }
    return resources;
  }

  private checkSRI(html: string): SecurityData['sri'] {
    const scriptRegex = /<script[^>]+src=["']([^"']*)["'][^>]*>/gi;
    let match;
    let externalScripts = 0;
    let withIntegrity = 0;
    const without: string[] = [];

    while ((match = scriptRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith('http://') || src.startsWith('https://')) {
        externalScripts++;
        if (/integrity=["']/.test(match[0])) {
          withIntegrity++;
        } else {
          without.push(src);
        }
      }
    }

    return { externalScripts, withIntegrity, without };
  }

  private checkForms(html: string): SecurityData['forms'] {
    const formRegex = /<form[^>]*>/gi;
    let match;
    let total = 0;
    const insecureAction: string[] = [];

    while ((match = formRegex.exec(html)) !== null) {
      total++;
      const actionMatch = match[0].match(/action=["'](http:\/\/[^"']*)["']/i);
      if (actionMatch) {
        insecureAction.push(actionMatch[1]);
      }
    }

    return { total, insecureAction };
  }

  private f(
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
