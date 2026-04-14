/**
 * WebScope API — Cloudflare Worker (proxy fetch)
 *
 * Receives a URL from the frontend, fetches it server-side (avoiding CORS),
 * and returns the HTML, headers, status code, and response time.
 */

interface Env {
  ALLOWED_ORIGIN: string;
}

// --- SSRF protection ---

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isUrlSafe(urlString: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Only http and https protocols are allowed' };
    }

    if (!url.hostname) {
      return { safe: false, reason: 'URL must have a hostname' };
    }

    if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) {
      return { safe: false, reason: 'Localhost and local addresses are not allowed' };
    }

    if (PRIVATE_RANGES.some((r) => r.test(url.hostname))) {
      return { safe: false, reason: 'Private/internal IP addresses are not allowed' };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

// --- Rate limiting (in-memory, per-isolate — basic) ---

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --- CORS headers ---

function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  // Allow the configured origin + localhost for dev
  const allowed =
    origin === allowedOrigin ||
    origin === 'http://localhost:4321' ||
    origin === 'http://localhost:3000';

  if (!allowed) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// --- Main handler ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405, cors);
    }

    // Rate limiting
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(clientIp)) {
      return jsonError('Rate limit exceeded. Try again later.', 429, cors);
    }

    // Parse target URL
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return jsonError('Missing required parameter: url', 400, cors);
    }

    // SSRF validation
    const validation = isUrlSafe(targetUrl);
    if (!validation.safe) {
      return jsonError(`Unsafe URL: ${validation.reason}`, 400, cors);
    }

    try {
      const startTime = Date.now();

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'WebScope/1.0 (site-audit-tool; +https://webscope.sal.dev.br)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const responseTime = Date.now() - startTime;

      // Limit response size to 5MB
      const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
      if (contentLength > 5 * 1024 * 1024) {
        return jsonError('Response too large (>5MB)', 413, cors);
      }

      const html = await response.text();
      if (html.length > 5 * 1024 * 1024) {
        return jsonError('Response too large (>5MB)', 413, cors);
      }

      // Collect headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return new Response(
        JSON.stringify({
          html,
          headers,
          statusCode: response.status,
          url: response.url, // Final URL after redirects
          responseTime,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors,
          },
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message.includes('timeout') || message.includes('aborted')) {
        return jsonError('Request timed out (10s limit)', 504, cors);
      }

      return jsonError(`Failed to fetch URL: ${message}`, 502, cors);
    }
  },
};

function jsonError(
  message: string,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
