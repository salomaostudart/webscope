import type {
  IAnalyzer, AnalysisInput, AnalyzerResult, Finding,
} from '../base/analyzer.interface';
import { scoreToGrade } from '../../utils/scoring';
import { extractImages, extractFavicon } from '../../utils/html-parser';
import type { ContentData } from './content.types';

const GENERIC_ALT = /^(image|photo|picture|img|pic|photo\d*|image\d*|img_?\d+|dsc_?\d+|screenshot)$/i;

const CTA_PATTERNS = [
  /buy\s+now/i, /sign\s+up/i, /get\s+started/i, /subscribe/i, /download/i,
  /try\s+(it\s+)?free/i, /start\s+(your\s+)?trial/i, /contact\s+us/i,
  /request\s+(a\s+)?demo/i, /learn\s+more/i, /book\s+(a\s+)?call/i,
  /schedule/i, /register/i, /join/i, /apply/i, /order/i, /comprar/i,
  /cadastr/i, /comecar/i, /assinar/i, /agendar/i, /fale\s+conosco/i,
];

const SOCIAL_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'github.com', 'pinterest.com',
];

export class ContentAnalyzer implements IAnalyzer<ContentData> {
  readonly name = 'content' as const;
  readonly displayName = 'Content';
  readonly description = 'Readability, broken links, CTAs, images';
  readonly weight = 15;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<ContentData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const { html } = input;

    // Strip HTML tags for text analysis
    const text = this.stripHtml(html);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    // Readability (simplified Flesch-Kincaid)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    const avgSyllables = this.avgSyllablesPerWord(words);
    const readabilityScore = Math.max(0, Math.min(100,
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllables));
    const readabilityLevel = readabilityScore >= 60 ? 'easy'
      : readabilityScore >= 30 ? 'moderate' : 'difficult';

    // Images
    const imagesRaw = extractImages(html);
    const genericAltCount = imagesRaw.images.filter(
      (i) => i.hasAlt && i.alt && GENERIC_ALT.test(i.alt),
    ).length;

    // CTAs
    const ctas = this.extractCTAs(html);

    // FAQ
    const hasFAQ = /faq|frequently\s+asked|perguntas\s+frequentes/i.test(html);

    // Contact info
    const hasContactInfo = this.hasContactInfo(html);

    // Social links
    const hasSocialLinks = SOCIAL_DOMAINS.some((d) => html.includes(d));

    // Favicon
    const favicon = extractFavicon(html);
    const hasFavicon = !!favicon || html.includes('favicon');

    // --- FINDINGS ---

    // Word count
    if (wordCount < 100) {
      findings.push(this.f('content-low-word-count', 'Content', 'Very little content',
        `Page has only ${wordCount} words.`, 'Add more meaningful content. Aim for at least 300 words on main pages.',
        'warning', 'medium', 'moderate', undefined, `${wordCount}`, '300+'));
    } else if (wordCount < 300) {
      findings.push(this.f('content-moderate-word-count', 'Content', 'Thin content',
        `Page has ${wordCount} words, below the recommended 300.`,
        'Consider expanding content with relevant information.',
        'info', 'low', 'moderate', undefined, `${wordCount}`, '300+'));
    }

    // Readability
    if (readabilityLevel === 'difficult') {
      findings.push(this.f('content-difficult-readability', 'Readability', 'Content is hard to read',
        `Readability score is ${Math.round(readabilityScore)} (difficult).`,
        'Use shorter sentences and simpler words. Aim for a score above 60.',
        'warning', 'medium', 'moderate', undefined,
        `${Math.round(readabilityScore)}`, '60+'));
    }

    // Images without alt
    if (imagesRaw.withoutAlt > 0) {
      findings.push(this.f('content-images-no-alt', 'Images', 'Images missing alt text',
        `${imagesRaw.withoutAlt} of ${imagesRaw.total} images have no alt attribute.`,
        'Add descriptive alt text to all images.',
        'critical', 'high', 'moderate'));
    }

    // Generic alt
    if (genericAltCount > 0) {
      findings.push(this.f('content-images-generic-alt', 'Images', 'Images with generic alt text',
        `${genericAltCount} images have generic alt text like "image" or "photo".`,
        'Replace with descriptive alternatives.',
        'warning', 'medium', 'quick-fix'));
    }

    // CTAs
    if (ctas.length === 0) {
      findings.push(this.f('content-no-cta', 'CTAs', 'No call-to-action found',
        'The page has no visible call-to-action buttons or links.',
        'Add at least one clear CTA (e.g., "Get Started", "Contact Us").',
        'warning', 'medium', 'quick-fix'));
    }

    // Contact info
    if (!hasContactInfo) {
      findings.push(this.f('content-no-contact', 'Contact', 'No contact information',
        'No email, phone number, or contact form found.',
        'Add contact information or a contact form.',
        'info', 'low', 'quick-fix'));
    }

    // Social links
    if (!hasSocialLinks) {
      findings.push(this.f('content-no-social', 'Social', 'No social media links',
        'No links to social media profiles found.',
        'Add links to relevant social media profiles.',
        'info', 'low', 'quick-fix'));
    }

    // Favicon
    if (!hasFavicon) {
      findings.push(this.f('content-no-favicon', 'Branding', 'No favicon',
        'No favicon found in the page.',
        'Add <link rel="icon" href="/favicon.svg"> to the <head>.',
        'warning', 'low', 'quick-fix'));
    }

    const score = this.calculateScore(findings);

    const data: ContentData = {
      wordCount,
      readabilityScore: Math.round(readabilityScore),
      readabilityLevel,
      images: {
        total: imagesRaw.total,
        withAlt: imagesRaw.withAlt,
        withGenericAlt: genericAltCount,
        withoutAlt: imagesRaw.withoutAlt,
      },
      ctas,
      hasFAQ,
      hasContactInfo,
      hasSocialLinks,
      hasFavicon,
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
      else if (f.severity === 'warning') score -= 5;
      else if (f.severity === 'info') score -= 1;
    }
    return Math.max(0, Math.min(100, score));
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private avgSyllablesPerWord(words: string[]): number {
    if (words.length === 0) return 0;
    const total = words.reduce((sum, w) => sum + this.countSyllables(w), 0);
    return total / words.length;
  }

  private countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    const vowelGroups = w.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (w.endsWith('e') && count > 1) count--;
    return Math.max(1, count);
  }

  private extractCTAs(html: string): ContentData['ctas'] {
    const ctas: ContentData['ctas'] = [];
    const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    let match;

    for (const regex of [linkRegex, buttonRegex]) {
      while ((match = regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (CTA_PATTERNS.some((p) => p.test(text))) {
          const href = match[0].match(/href=["']([^"']*)["']/i)?.[1] || '';
          ctas.push({ text, href });
        }
      }
    }
    return ctas;
  }

  private hasContactInfo(html: string): boolean {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phonePattern = /[\+]?[\d\s\-()]{10,}/;
    const formPattern = /<form[^>]*>/i;
    return emailPattern.test(html) || phonePattern.test(html) || formPattern.test(html);
  }

  private f(
    id: string, category: string, title: string, description: string, recommendation: string,
    severity: Finding['severity'], impact: Finding['impact'], effort: Finding['effort'],
    element?: string, value?: string, expected?: string,
  ): Finding {
    return {
      id, analyzer: this.name, severity, category, title, description,
      recommendation, impact, effort, element, value, expected,
    };
  }
}
