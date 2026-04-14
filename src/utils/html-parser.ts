/**
 * HTML parsing utilities for extracting SEO-relevant data from raw HTML strings.
 * Uses regex-based parsing (no DOM dependency) for server/test compatibility.
 */

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

export function extractMetaContent(html: string, name: string): string | null {
  // Match both name="..." and property="..." (for Open Graph)
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escapeRegex(name)}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export function extractMetaDescription(html: string): string | null {
  return extractMetaContent(html, 'description');
}

export function extractViewport(html: string): string | null {
  return extractMetaContent(html, 'viewport');
}

export function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
    || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  return match ? match[1].trim() : null;
}

export function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]+lang=["']([^"']*)["']/i);
  return match ? match[1].trim() : null;
}

export interface HeadingsResult {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
  hierarchyValid: boolean;
}

export function extractHeadings(html: string): HeadingsResult {
  const result: HeadingsResult = {
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    hierarchyValid: true,
  };

  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let lastLevel = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase() as keyof Omit<HeadingsResult, 'hierarchyValid'>;
    const text = stripTags(match[2]).trim();
    result[tag].push(text);

    const level = parseInt(tag[1]);
    if (lastLevel > 0 && level > lastLevel + 1) {
      result.hierarchyValid = false;
    }
    lastLevel = level;
  }

  return result;
}

export interface ImageInfo {
  src: string;
  alt: string | null;
  hasAlt: boolean;
}

export interface ImagesResult {
  total: number;
  withAlt: number;
  withoutAlt: number;
  images: ImageInfo[];
}

export function extractImages(html: string): ImagesResult {
  const images: ImageInfo[] = [];
  const imgRegex = /<img[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const src = extractAttr(tag, 'src') || '';
    const alt = extractAttr(tag, 'alt');
    images.push({ src, alt, hasAlt: alt !== null });
  }

  return {
    total: images.length,
    withAlt: images.filter((i) => i.hasAlt).length,
    withoutAlt: images.filter((i) => !i.hasAlt).length,
    images,
  };
}

export interface LinksResult {
  internal: number;
  external: number;
  internalUrls: string[];
  externalUrls: string[];
  noText: string[];
}

export function extractLinks(html: string, baseUrl: string): LinksResult {
  const result: LinksResult = {
    internal: 0, external: 0,
    internalUrls: [], externalUrls: [], noText: [],
  };

  const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  let baseHost: string;

  try {
    baseHost = new URL(baseUrl).hostname;
  } catch {
    baseHost = '';
  }

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const text = stripTags(match[1]).trim();
    const href = extractAttr(tag, 'href');

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === baseHost) {
        result.internal++;
        result.internalUrls.push(resolved.href);
      } else {
        result.external++;
        result.externalUrls.push(resolved.href);
      }
    } catch {
      result.internal++;
      result.internalUrls.push(href);
    }

    if (!text || /^(click here|here|read more|learn more|more|link)$/i.test(text)) {
      result.noText.push(href);
    }
  }

  return result;
}

export interface StructuredDataItem {
  type: string;
  valid: boolean;
  raw: Record<string, unknown>;
}

export function extractStructuredData(html: string): StructuredDataItem[] {
  const items: StructuredDataItem[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      items.push({
        type: (parsed['@type'] as string) || 'Unknown',
        valid: !!parsed['@type'],
        raw: parsed,
      });
    } catch {
      items.push({ type: 'Invalid JSON', valid: false, raw: {} });
    }
  }

  return items;
}

export function extractOpenGraph(html: string): Record<string, string | null> {
  const tags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const result: Record<string, string | null> = {};
  for (const tag of tags) {
    result[tag] = extractMetaContent(html, tag);
  }
  return result;
}

export function extractTwitterCard(html: string): Record<string, string | null> {
  const tags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  const result: Record<string, string | null> = {};
  for (const tag of tags) {
    result[tag] = extractMetaContent(html, tag);
  }
  return result;
}

export function extractCharset(html: string): string | null {
  const match = html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
  return match ? match[1].trim().toLowerCase() : null;
}

export function extractFavicon(html: string): string | null {
  const match = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i)
    || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i);
  return match ? match[1].trim() : null;
}

// --- Helpers ---

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function extractAttr(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
