import type {
  IAnalyzer, AnalysisInput, AnalyzerResult, Finding,
} from '../base/analyzer.interface';
import { scoreToGrade } from '../../utils/scoring';
import {
  extractTitle, extractMetaDescription, extractViewport, extractCanonical,
  extractLanguage, extractHeadings, extractImages, extractLinks,
  extractStructuredData, extractOpenGraph, extractTwitterCard,
  extractCharset, extractFavicon,
} from '../../utils/html-parser';
import type { SEOData } from './seo.types';

const GENERIC_ALT = /^(image|photo|picture|img|pic|photo\d*|image\d*|img_?\d+|dsc_?\d+|screenshot)$/i;

export class SEOAnalyzer implements IAnalyzer<SEOData> {
  readonly name = 'seo' as const;
  readonly displayName = 'SEO';
  readonly description = 'Meta tags, headings, structured data, crawlability';
  readonly weight = 25;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<SEOData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const { html, url } = input;

    // Extract data
    const titleRaw = extractTitle(html);
    const descRaw = extractMetaDescription(html);
    const viewport = extractViewport(html);
    const canonical = extractCanonical(html);
    const language = extractLanguage(html);
    const headings = extractHeadings(html);
    const imagesRaw = extractImages(html);
    const links = extractLinks(html, url);
    const structuredData = extractStructuredData(html);
    const openGraph = extractOpenGraph(html);
    const twitterCard = extractTwitterCard(html);
    const charset = extractCharset(html);
    const favicon = extractFavicon(html);
    const https = url.startsWith('https://');

    const lighthouseSeoScore = input.lighthouse?.categories?.seo?.score != null
      ? Math.round(input.lighthouse.categories.seo.score * 100) : 0;

    // Count generic alts
    const genericAltCount = imagesRaw.images.filter(
      (i) => i.hasAlt && i.alt && GENERIC_ALT.test(i.alt),
    ).length;

    // --- FINDINGS ---

    // Title
    if (!titleRaw) {
      findings.push(this.f('seo-missing-title', 'Meta Tags', 'Missing title tag',
        'The page does not have a <title> tag.', 'Add a descriptive title tag between 30-60 characters.',
        'critical', 'high', 'quick-fix'));
    } else if (titleRaw.length > 60) {
      findings.push(this.f('seo-title-too-long', 'Meta Tags', 'Title tag too long',
        `Title has ${titleRaw.length} characters. Google typically shows 50-60 characters.`,
        'Shorten the title to 30-60 characters.', 'warning', 'medium', 'quick-fix',
        undefined, `${titleRaw.length} chars`, '30-60 chars'));
    } else if (titleRaw.length < 30) {
      findings.push(this.f('seo-title-too-short', 'Meta Tags', 'Title tag too short',
        `Title has ${titleRaw.length} characters.`, 'Expand the title to at least 30 characters.',
        'warning', 'low', 'quick-fix', undefined, `${titleRaw.length} chars`, '30-60 chars'));
    }

    // Meta description
    if (!descRaw) {
      findings.push(this.f('seo-missing-meta-description', 'Meta Tags', 'Missing meta description',
        'The page has no meta description.', 'Add a meta description between 120-160 characters.',
        'critical', 'high', 'quick-fix'));
    } else if (descRaw.length > 160) {
      findings.push(this.f('seo-description-too-long', 'Meta Tags', 'Meta description too long',
        `Description has ${descRaw.length} characters.`, 'Shorten to 120-160 characters.',
        'warning', 'medium', 'quick-fix', undefined, `${descRaw.length} chars`, '120-160 chars'));
    } else if (descRaw.length < 120) {
      findings.push(this.f('seo-description-too-short', 'Meta Tags', 'Meta description too short',
        `Description has ${descRaw.length} characters.`, 'Expand to at least 120 characters.',
        'info', 'low', 'quick-fix', undefined, `${descRaw.length} chars`, '120-160 chars'));
    }

    // Viewport
    if (!viewport) {
      findings.push(this.f('seo-missing-viewport', 'Meta Tags', 'Missing viewport meta tag',
        'No <meta name="viewport"> found.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        'warning', 'medium', 'quick-fix'));
    }

    // Charset
    if (!charset) {
      findings.push(this.f('seo-missing-charset', 'Meta Tags', 'Missing charset declaration',
        'No charset meta tag found.', 'Add <meta charset="utf-8"> in the <head>.',
        'info', 'low', 'quick-fix'));
    }

    // Headings
    if (headings.h1.length === 0) {
      findings.push(this.f('seo-missing-h1', 'Headings', 'No H1 tag found',
        'The page does not have an H1 heading.', 'Add exactly one H1 tag with the main topic of the page.',
        'critical', 'high', 'quick-fix'));
    } else if (headings.h1.length > 1) {
      findings.push(this.f('seo-multiple-h1', 'Headings', 'Multiple H1 tags',
        `Found ${headings.h1.length} H1 tags. Best practice is exactly one.`,
        'Keep only one H1 that describes the main topic.', 'warning', 'medium', 'quick-fix',
        undefined, `${headings.h1.length}`, '1'));
    }

    if (!headings.hierarchyValid) {
      findings.push(this.f('seo-heading-hierarchy', 'Headings', 'Broken heading hierarchy',
        'Heading levels skip (e.g., H1 → H3 without H2).', 'Maintain sequential heading hierarchy: H1 → H2 → H3.',
        'warning', 'medium', 'quick-fix'));
    }

    // Empty headings
    const emptyHeadings = [...headings.h1, ...headings.h2, ...headings.h3, ...headings.h4, ...headings.h5, ...headings.h6]
      .filter((h) => !h || h.trim() === '');
    if (emptyHeadings.length > 0) {
      findings.push(this.f('seo-empty-headings', 'Headings', 'Empty heading tags found',
        `${emptyHeadings.length} heading tag(s) have no text content.`, 'Add meaningful text to all heading tags.',
        'warning', 'low', 'quick-fix'));
    }

    // Images
    if (imagesRaw.withoutAlt > 0) {
      findings.push(this.f('seo-images-without-alt', 'Images', 'Images missing alt text',
        `${imagesRaw.withoutAlt} of ${imagesRaw.total} images have no alt attribute.`,
        'Add descriptive alt text to all images.', 'critical', 'high', 'moderate',
        undefined, `${imagesRaw.withoutAlt} missing`, 'All images with alt'));
    }

    if (genericAltCount > 0) {
      findings.push(this.f('seo-images-generic-alt', 'Images', 'Images with generic alt text',
        `${genericAltCount} images have generic alt text (e.g., "image", "photo").`,
        'Replace generic alt text with descriptive alternatives.', 'warning', 'medium', 'quick-fix'));
    }

    // Links
    if (links.internal === 0) {
      findings.push(this.f('seo-no-internal-links', 'Links', 'No internal links',
        'The page has no internal links.', 'Add links to other pages on your site.',
        'warning', 'medium', 'quick-fix'));
    }

    if (links.noText.length > 0) {
      findings.push(this.f('seo-links-no-text', 'Links', 'Links with non-descriptive text',
        `${links.noText.length} links have generic text like "click here" or "read more".`,
        'Use descriptive link text that explains where the link goes.',
        'info', 'low', 'quick-fix'));
    }

    // Canonical
    if (!canonical) {
      findings.push(this.f('seo-missing-canonical', 'Crawlability', 'Missing canonical URL',
        'No <link rel="canonical"> found.', 'Add a canonical link to prevent duplicate content issues.',
        'warning', 'medium', 'quick-fix'));
    }

    // HTTPS
    if (!https) {
      findings.push(this.f('seo-no-https', 'URL Structure', 'Site not using HTTPS',
        'The URL uses HTTP instead of HTTPS.', 'Migrate to HTTPS — it affects SEO ranking and user trust.',
        'critical', 'high', 'moderate'));
    }

    // Language
    if (!language) {
      findings.push(this.f('seo-missing-language', 'Meta Tags', 'Missing language attribute',
        'No lang attribute on <html> tag.', 'Add lang="en" (or appropriate language) to the <html> tag.',
        'warning', 'medium', 'quick-fix'));
    }

    // Open Graph
    const ogMissing = Object.entries(openGraph)
      .filter(([key, val]) => !val && ['og:title', 'og:description', 'og:image'].includes(key))
      .map(([key]) => key);
    if (ogMissing.length > 0) {
      findings.push(this.f('seo-missing-og', 'Social', `Missing Open Graph tags: ${ogMissing.join(', ')}`,
        'Open Graph tags are used when the page is shared on social media.',
        `Add ${ogMissing.join(', ')} meta tags.`, 'warning', 'medium', 'quick-fix'));
    }

    // Structured data
    if (structuredData.length === 0) {
      findings.push(this.f('seo-no-structured-data', 'Structured Data', 'No structured data found',
        'The page has no JSON-LD structured data.', 'Add JSON-LD structured data (Organization, WebSite, etc.).',
        'info', 'medium', 'moderate'));
    }

    // Favicon
    if (!favicon) {
      findings.push(this.f('seo-missing-favicon', 'Meta Tags', 'Missing favicon',
        'No favicon link found in HTML.', 'Add <link rel="icon" href="/favicon.svg">.',
        'warning', 'low', 'quick-fix'));
    }

    // Calculate score
    const score = this.calculateScore(findings, lighthouseSeoScore);

    const data: SEOData = {
      title: {
        value: titleRaw,
        length: titleRaw?.length ?? 0,
        isOptimal: !!titleRaw && titleRaw.length >= 30 && titleRaw.length <= 60,
      },
      metaDescription: {
        value: descRaw,
        length: descRaw?.length ?? 0,
        isOptimal: !!descRaw && descRaw.length >= 120 && descRaw.length <= 160,
      },
      headings,
      links,
      images: {
        total: imagesRaw.total,
        withAlt: imagesRaw.withAlt,
        withoutAlt: imagesRaw.withoutAlt,
        withGenericAlt: genericAltCount,
      },
      structuredData,
      openGraph,
      twitterCard,
      canonical,
      charset,
      viewport,
      language,
      favicon,
      https,
      lighthouseSeoScore,
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

  private calculateScore(findings: Finding[], lighthouseScore: number): number {
    // Start from 100, deduct per finding based on severity
    const deductions: Record<string, number> = {
      critical: 15,
      warning: 5,
      info: 1,
      pass: 0,
    };

    let score = 100;
    for (const f of findings) {
      score -= deductions[f.severity] ?? 0;
    }

    // Blend with Lighthouse SEO score if available (30% weight)
    if (lighthouseScore > 0) {
      score = Math.round(score * 0.7 + lighthouseScore * 0.3);
    }

    return Math.max(0, Math.min(100, score));
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
