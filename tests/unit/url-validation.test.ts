import { describe, expect, it } from 'vitest';
import { extractDomain, isValidUrl, normalizeUrl } from '../../src/utils/url-validation';

describe('isValidUrl', () => {
  it('should accept valid https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('should accept valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('should reject malformed URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('should reject ftp protocol', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('should reject javascript protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('should accept URL with path', () => {
    expect(isValidUrl('https://example.com/about?q=1#section')).toBe(true);
  });
});

describe('normalizeUrl', () => {
  it('should add https:// if missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('should keep existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should keep existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
  });
});

describe('extractDomain', () => {
  it('should extract domain from URL', () => {
    expect(extractDomain('https://www.example.com/page')).toBe('www.example.com');
  });

  it('should return empty string for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBe('');
  });
});
