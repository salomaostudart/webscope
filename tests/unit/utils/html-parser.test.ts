import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractCanonical,
  extractCharset,
  extractFavicon,
  extractHeadings,
  extractImages,
  extractLanguage,
  extractLinks,
  extractMetaDescription,
  extractOpenGraph,
  extractStructuredData,
  extractTitle,
  extractViewport,
} from '../../../src/utils/html-parser';

const goodHtml = readFileSync(join(__dirname, '../mocks/html-good.html'), 'utf-8');
const badHtml = readFileSync(join(__dirname, '../mocks/html-bad.html'), 'utf-8');
const minimalHtml = readFileSync(join(__dirname, '../mocks/html-minimal.html'), 'utf-8');

describe('extractTitle', () => {
  it('should extract title from good HTML', () => {
    expect(extractTitle(goodHtml)).toBe('Best Coffee Shops in Portland - Local Guide 2026');
  });

  it('should return null when no title', () => {
    expect(extractTitle(badHtml)).toBeNull();
  });

  it('should return null for minimal HTML', () => {
    expect(extractTitle(minimalHtml)).toBeNull();
  });

  it('should handle unclosed title without throwing', () => {
    expect(() => extractTitle('<title>Unclosed')).not.toThrow();
  });

  it('should trim whitespace', () => {
    expect(extractTitle('<title>  Test  </title>')).toBe('Test');
  });
});

describe('extractMetaDescription', () => {
  it('should extract description from good HTML', () => {
    const desc = extractMetaDescription(goodHtml);
    expect(desc).toContain('top 15 coffee shops');
  });

  it('should return null when no description', () => {
    expect(extractMetaDescription(badHtml)).toBeNull();
  });
});

describe('extractViewport', () => {
  it('should extract viewport from good HTML', () => {
    expect(extractViewport(goodHtml)).toContain('width=device-width');
  });

  it('should return null when missing', () => {
    expect(extractViewport(badHtml)).toBeNull();
  });
});

describe('extractCanonical', () => {
  it('should extract canonical from good HTML', () => {
    expect(extractCanonical(goodHtml)).toBe('https://example.com/best-coffee-portland');
  });

  it('should return null when missing', () => {
    expect(extractCanonical(badHtml)).toBeNull();
  });
});

describe('extractLanguage', () => {
  it('should extract lang from good HTML', () => {
    expect(extractLanguage(goodHtml)).toBe('en');
  });

  it('should return null when missing', () => {
    expect(extractLanguage(badHtml)).toBeNull();
  });
});

describe('extractHeadings', () => {
  it('should extract headings from good HTML in order', () => {
    const h = extractHeadings(goodHtml);
    expect(h.h1).toEqual(['Best Coffee Shops in Portland']);
    expect(h.h2.length).toBe(3);
    expect(h.h3.length).toBe(1);
    expect(h.hierarchyValid).toBe(true);
  });

  it('should detect multiple H1s in bad HTML', () => {
    const h = extractHeadings(badHtml);
    expect(h.h1.length).toBe(3);
  });

  it('should detect broken hierarchy in bad HTML', () => {
    const h = extractHeadings(badHtml);
    expect(h.hierarchyValid).toBe(false);
  });

  it('should return empty arrays for minimal HTML', () => {
    const h = extractHeadings(minimalHtml);
    expect(h.h1).toEqual([]);
    expect(h.h2).toEqual([]);
  });
});

describe('extractImages', () => {
  it('should count images with and without alt in good HTML', () => {
    const imgs = extractImages(goodHtml);
    expect(imgs.total).toBe(3);
    expect(imgs.withAlt).toBe(3);
    expect(imgs.withoutAlt).toBe(0);
  });

  it('should detect images without alt in bad HTML', () => {
    const imgs = extractImages(badHtml);
    expect(imgs.total).toBe(5);
    expect(imgs.withoutAlt).toBe(2);
    expect(imgs.withAlt).toBe(3);
  });
});

describe('extractLinks', () => {
  it('should separate internal and external links', () => {
    const links = extractLinks(goodHtml, 'https://example.com');
    expect(links.internal).toBe(3);
    expect(links.external).toBe(1);
  });

  it('should detect non-descriptive link text', () => {
    const links = extractLinks(badHtml, 'https://example.com');
    expect(links.noText.length).toBeGreaterThan(0);
  });
});

describe('extractStructuredData', () => {
  it('should extract JSON-LD from good HTML', () => {
    const sd = extractStructuredData(goodHtml);
    expect(sd.length).toBe(1);
    expect(sd[0].type).toBe('Article');
    expect(sd[0].valid).toBe(true);
  });

  it('should return empty array when no structured data', () => {
    expect(extractStructuredData(badHtml)).toEqual([]);
  });
});

describe('extractOpenGraph', () => {
  it('should extract OG tags from good HTML', () => {
    const og = extractOpenGraph(goodHtml);
    expect(og['og:title']).toBe('Best Coffee Shops in Portland');
    expect(og['og:image']).toContain('coffee-portland.jpg');
  });

  it('should return null for missing OG tags', () => {
    const og = extractOpenGraph(badHtml);
    expect(og['og:title']).toBeNull();
  });
});

describe('extractCharset', () => {
  it('should extract charset from good HTML', () => {
    expect(extractCharset(goodHtml)).toBe('utf-8');
  });

  it('should return null when missing', () => {
    expect(extractCharset(minimalHtml)).toBeNull();
  });
});

describe('extractFavicon', () => {
  it('should extract favicon from good HTML', () => {
    expect(extractFavicon(goodHtml)).toBe('/favicon.svg');
  });

  it('should return null when missing', () => {
    expect(extractFavicon(badHtml)).toBeNull();
  });
});
