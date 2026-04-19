import { extractFavicon, extractMetaContent } from '../../utils/html-parser';
import { scoreToGrade } from '../../utils/scoring';
import type { AnalysisInput, AnalyzerResult, Finding, IAnalyzer } from '../base/analyzer.interface';
import type { BrandingData, ColorInfo, FontInfo } from './branding.types';

const SYSTEM_FONTS = [
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'roboto',
  'helvetica',
  'arial',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'inherit',
  'initial',
  'unset',
];

export class BrandingAnalyzer implements IAnalyzer<BrandingData> {
  readonly name = 'branding' as const;
  readonly displayName = 'Branding';
  readonly description = 'Colors, fonts, logo, favicon, consistency';
  readonly weight = 10;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<BrandingData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const { html } = input;

    // --- Colors ---
    const colors = this.extractColors(html);
    if (colors.totalUnique > 8) {
      findings.push(
        this.f(
          'brand-too-many-colors',
          'Colors',
          'Too many distinct colors',
          `Found ${colors.totalUnique} unique colors. A consistent brand uses fewer than 8 primary colors.`,
          'Consolidate your color palette. Define primary, secondary, and accent colors.',
          'info',
          'low',
          'moderate',
          undefined,
          `${colors.totalUnique}`,
          '< 8',
        ),
      );
    }

    // --- Fonts ---
    const fonts = this.extractFonts(html);
    if (fonts.totalFamilies > 4) {
      findings.push(
        this.f(
          'brand-too-many-fonts',
          'Typography',
          'Too many font families',
          `Found ${fonts.totalFamilies} font families. More than 3-4 hurts consistency and performance.`,
          'Limit to 2-3 font families: one for headings, one for body, optionally one for code.',
          'info',
          'low',
          'moderate',
          undefined,
          `${fonts.totalFamilies}`,
          '2-3',
        ),
      );
    }

    if (!fonts.hasDisplaySwap) {
      findings.push(
        this.f(
          'brand-no-font-swap',
          'Typography',
          'Missing font-display: swap',
          'Custom fonts may cause invisible text during loading.',
          'Add font-display: swap to @font-face declarations or Google Fonts URL parameter.',
          'info',
          'low',
          'quick-fix',
        ),
      );
    }

    // --- Logo ---
    const logo = this.detectLogo(html);
    if (!logo.found) {
      findings.push(
        this.f(
          'brand-no-logo',
          'Logo',
          'No logo detected',
          'Could not find a logo image in the page header.',
          'Add a logo image with "logo" in the src, alt, or class attribute.',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- Favicon ---
    const faviconHref = extractFavicon(html);
    const faviconFound = !!faviconHref || html.includes('favicon');
    const faviconType = faviconHref
      ? faviconHref.endsWith('.svg')
        ? 'svg'
        : faviconHref.endsWith('.ico')
          ? 'ico'
          : 'png'
      : null;

    if (!faviconFound) {
      findings.push(
        this.f(
          'brand-no-favicon',
          'Favicon',
          'No favicon found',
          'The page does not have a favicon link.',
          'Add <link rel="icon" type="image/svg+xml" href="/favicon.svg">.',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- Apple Touch Icon ---
    const appleTouchIcon = /<link[^>]+rel=["']apple-touch-icon["']/i.test(html);
    if (!appleTouchIcon) {
      findings.push(
        this.f(
          'brand-no-apple-icon',
          'Icons',
          'No Apple touch icon',
          'Missing apple-touch-icon for iOS home screen.',
          'Add <link rel="apple-touch-icon" href="/apple-touch-icon.png">.',
          'info',
          'low',
          'quick-fix',
        ),
      );
    }

    // --- OG Image ---
    const ogImage = extractMetaContent(html, 'og:image');
    if (!ogImage) {
      findings.push(
        this.f(
          'brand-no-og-image',
          'Social',
          'No Open Graph image',
          'No og:image meta tag found. Shared links will have no preview image.',
          'Add <meta property="og:image" content="https://..."> with a 1200x630px image.',
          'warning',
          'medium',
          'quick-fix',
        ),
      );
    }

    // --- Theme Color ---
    const themeColor = extractMetaContent(html, 'theme-color');
    if (!themeColor) {
      findings.push(
        this.f(
          'brand-no-theme-color',
          'PWA',
          'No theme-color meta tag',
          "Browser UI (address bar) won't match your brand color.",
          'Add <meta name="theme-color" content="#818cf8">.',
          'info',
          'low',
          'quick-fix',
        ),
      );
    }

    // --- PWA Manifest ---
    const manifest = this.checkManifest(html);
    if (!manifest.found) {
      findings.push(
        this.f(
          'brand-no-manifest',
          'PWA',
          'No web app manifest',
          'No manifest.json or manifest.webmanifest linked.',
          'Add a manifest for PWA support and better branding on mobile.',
          'info',
          'low',
          'moderate',
        ),
      );
    }

    const score = this.calculateScore(findings);

    const data: BrandingData = {
      colors,
      fonts,
      logo,
      favicon: { found: faviconFound, type: faviconType },
      appleTouchIcon,
      ogImage,
      manifest,
      themeColor,
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
      else if (f.severity === 'info') score -= 3;
    }
    return Math.max(0, Math.min(100, score));
  }

  private extractColors(html: string): BrandingData['colors'] {
    const colorSet = new Set<string>();
    const palette: ColorInfo[] = [];

    // Extract from inline styles and <style> blocks
    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;

    let match;
    while ((match = hexRegex.exec(html)) !== null) {
      const hex = this.normalizeHex(match[1]);
      if (hex && !this.isGrayscale(hex)) {
        colorSet.add(hex);
      }
    }

    while ((match = rgbRegex.exec(html)) !== null) {
      const r = Number.parseInt(match[1]);
      const g = Number.parseInt(match[2]);
      const b = Number.parseInt(match[3]);
      const hex = this.rgbToHex(r, g, b);
      if (!this.isGrayscale(hex)) {
        colorSet.add(hex);
      }
    }

    for (const hex of colorSet) {
      palette.push({ hex: `#${hex}`, usage: 'detected', count: 1 });
    }

    return {
      palette: palette.slice(0, 20),
      totalUnique: colorSet.size,
      isConsistent: colorSet.size <= 8,
    };
  }

  private normalizeHex(hex: string): string | null {
    if (hex.length === 3) {
      return hex
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase();
    }
    if (hex.length === 6) {
      return hex.toLowerCase();
    }
    if (hex.length === 8) {
      return hex.substring(0, 6).toLowerCase();
    }
    return null;
  }

  private isGrayscale(hex: string): boolean {
    if (hex.length !== 6) return false;
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);
    return Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return [r, g, b]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();
  }

  private extractFonts(html: string): BrandingData['fonts'] {
    const families: FontInfo[] = [];
    const seen = new Set<string>();

    // Google Fonts from link tags — extract full URL then parse all family= params
    const googleUrlMatch = html.match(/href=["']([^"']*fonts\.googleapis\.com\/css2?[^"']*)["']/gi);
    if (googleUrlMatch) {
      for (const m of googleUrlMatch) {
        const url = m.replace(/^href=["']/, '').replace(/["']$/, '');
        const familyMatches = url.matchAll(/family=([^&"']+)/gi);
        for (const fm of familyMatches) {
          const raw = decodeURIComponent(fm[1]);
          const name = raw.split(':')[0].replace(/\+/g, ' ');
          if (!seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            const weightsMatch = raw.match(/:wght@([\d;,]+)/);
            const weights = weightsMatch ? weightsMatch[1].split(/[;,]/) : ['400'];
            families.push({ name, weights, source: 'google' });
          }
        }
      }
    }

    // font-family from CSS
    const ffRegex = /font-family:\s*['"]?([^;'"{}]+)/gi;
    let match;
    while ((match = ffRegex.exec(html)) !== null) {
      const raw = match[1].split(',')[0].trim().replace(/['"]/g, '');
      if (!seen.has(raw.toLowerCase()) && !SYSTEM_FONTS.includes(raw.toLowerCase())) {
        seen.add(raw.toLowerCase());
        families.push({ name: raw, weights: [], source: 'custom' });
      }
    }

    const hasDisplaySwap = /font-display:\s*swap/i.test(html) || /display=swap/.test(html);

    const hasPreload =
      /<link[^>]+rel=["']preload["'][^>]+as=["']font["']/i.test(html) ||
      /<link[^>]+as=["']font["'][^>]+rel=["']preload["']/i.test(html);

    return {
      families,
      totalFamilies: families.length,
      hasDisplaySwap: hasDisplaySwap,
      hasPreload,
    };
  }

  private detectLogo(html: string): BrandingData['logo'] {
    // Look for img with logo in src, alt, or class
    const logoRegex = /<img[^>]*(?:src|alt|class)=["'][^"']*logo[^"']*["'][^>]*>/i;
    const match = html.match(logoRegex);

    if (match) {
      const srcMatch = match[0].match(/src=["']([^"']*)["']/i);
      const inHeader = this.isInHeader(html, match.index || 0);
      return { found: true, src: srcMatch?.[1] || null, inHeader };
    }

    // Check for SVG logo in header
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
    if (headerMatch && /<svg[^>]*>[\s\S]*?<\/svg>/i.test(headerMatch[0])) {
      return { found: true, src: null, inHeader: true };
    }

    return { found: false, src: null, inHeader: false };
  }

  private isInHeader(html: string, position: number): boolean {
    const before = html.substring(0, position);
    const headerOpen = before.lastIndexOf('<header');
    const headerClose = before.lastIndexOf('</header');
    return headerOpen > headerClose;
  }

  private checkManifest(html: string): BrandingData['manifest'] {
    const manifestLink =
      html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']*)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']manifest["']/i);

    if (!manifestLink) {
      return { found: false, hasName: false, hasIcons: false, hasThemeColor: false };
    }

    // Can't read manifest content from HTML alone, so just check it's linked
    return { found: true, hasName: true, hasIcons: true, hasThemeColor: true };
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
