/**
 * WebScope API — Cloudflare Worker (proxy fetch)
 *
 * Receives a URL from the frontend, fetches it server-side (avoiding CORS),
 * and returns the HTML, headers, status code, and response time.
 */

interface Env {
  ALLOWED_ORIGIN: string;
  AI: Ai;
  FEEDBACK_SCREENSHOTS: KVNamespace;
  GITHUB_TOKEN: string;
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
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
    }

    const url = new URL(request.url);

    // Route: POST /ai — AI suggestions
    if (url.pathname === '/ai' && request.method === 'POST') {
      return handleAI(request, env, cors);
    }

    // Route: POST /feedback — bug/feedback reporting
    if (url.pathname === '/feedback' && request.method === 'POST') {
      return handleFeedback(request, env, cors);
    }

    // Route: GET /screenshot/:id — serve screenshot from KV
    if (url.pathname.startsWith('/screenshot/') && request.method === 'GET') {
      return handleScreenshot(url.pathname, env, cors);
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405, cors);
    }

    // Rate limiting
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(clientIp)) {
      return jsonError('Rate limit exceeded. Try again later.', 429, cors);
    }
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

// --- AI Suggestions handler ---

const aiRateCounts = new Map<string, { count: number; resetAt: number }>();
const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW = 60 * 60 * 1000;

async function handleAI(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limit: 20/hour
  const now = Date.now();
  const entry = aiRateCounts.get(clientIp);
  if (entry && now < entry.resetAt && entry.count >= AI_RATE_LIMIT) {
    return jsonError('AI rate limit exceeded. Try again later.', 429, cors);
  }
  if (!entry || now > (entry?.resetAt ?? 0)) {
    aiRateCounts.set(clientIp, { count: 1, resetAt: now + AI_RATE_WINDOW });
  } else {
    entry.count++;
  }

  try {
    const body = await request.json() as {
      findings: Array<{ id: string; severity: string; title: string; recommendation: string; analyzer: string; category: string }>;
      url: string;
      score: number;
      grade: string;
    };

    if (!body.findings || !body.url) {
      return jsonError('Missing required fields: findings, url', 400, cors);
    }

    // Build compact prompt (no HTML, just findings)
    const findingsSummary = body.findings
      .filter((f) => f.severity !== 'pass')
      .slice(0, 20)
      .map((f) => `[${f.severity}] ${f.title} (${f.analyzer}/${f.category}): ${f.recommendation}`)
      .join('\n');

    const prompt = `Analyze these website audit findings and generate:

1. EXECUTIVE SUMMARY: 2-3 sentences about the overall state of the site.
2. TOP 5 QUICK WINS: actions ordered by impact/effort ratio.

Each quick win must have:
- title: short action description (max 10 words)
- impact: high, medium, or low
- effort: quick-fix, moderate, or complex
- category: performance, seo, accessibility, content, branding, or security
- estimatedScoreGain: number between 1 and 15

URL: ${body.url}
Current score: ${body.score}/100 (${body.grade})

Findings:
${findingsSummary}

Respond ONLY with valid JSON in this exact format, no markdown:
{"summary":"...","quickWins":[{"title":"...","impact":"...","effort":"...","category":"...","estimatedScoreGain":0}]}`;

    const aiResult = await env.AI.run('@cf/qwen/qwen2.5-coder-32b-instruct' as any, {
      messages: [
        { role: 'system', content: 'You are a web audit consultant. Always respond with valid JSON only, no markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
    });

    // Parse AI response
    const responseText = (aiResult as any).response || '';
    let parsed;
    try {
      // Try to extract JSON from response (may have markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: responseText, quickWins: [] };
    } catch {
      parsed = { summary: responseText.substring(0, 500), quickWins: [] };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return jsonError(`AI error: ${message}`, 502, cors);
  }
}

// --- Feedback handler ---

interface FeedbackPayload {
  type: 'bug' | 'improvement' | 'question';
  description: string;
  screenshot?: string; // base64 data URL
  context: {
    url: string;
    viewport: string;
    userAgent: string;
    timestamp: string;
    theme: string;
    auditScore?: number;
    auditGrade?: string;
    consoleErrors?: string[];
    networkErrors?: string[];
  };
}

const feedbackRateCounts = new Map<string, { count: number; resetAt: number }>();

async function handleFeedback(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limit: 10/hour
  const now = Date.now();
  const entry = feedbackRateCounts.get(clientIp);
  if (entry && now < entry.resetAt && entry.count >= 10) {
    return jsonError('Feedback rate limit exceeded.', 429, cors);
  }
  if (!entry || now > (entry?.resetAt ?? 0)) {
    feedbackRateCounts.set(clientIp, { count: 1, resetAt: now + 60 * 60 * 1000 });
  } else {
    entry.count++;
  }

  try {
    const body = await request.json() as FeedbackPayload;

    if (!body.description || body.description.length < 10) {
      return jsonError('Description must be at least 10 characters.', 400, cors);
    }

    // Store screenshot in KV if present
    let screenshotUrl = '';
    if (body.screenshot && body.screenshot.startsWith('data:image/')) {
      const id = crypto.randomUUID();
      await env.FEEDBACK_SCREENSHOTS.put(`screenshot:${id}`, body.screenshot, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 days
      });
      screenshotUrl = `https://webscope-api.salomaomstudart.workers.dev/screenshot/${id}`;
    }

    // Build GitHub Issue
    const labels = {
      bug: 'bug',
      improvement: 'enhancement',
      question: 'question',
    };

    const title = `[${body.type.charAt(0).toUpperCase() + body.type.slice(1)}] ${body.description.substring(0, 60)}`;

    let issueBody = `## Description\n\n${body.description}\n\n`;
    issueBody += `## Context\n\n`;
    issueBody += `| Field | Value |\n|---|---|\n`;
    issueBody += `| URL | ${body.context.url} |\n`;
    issueBody += `| Viewport | ${body.context.viewport} |\n`;
    issueBody += `| Theme | ${body.context.theme} |\n`;
    issueBody += `| Timestamp | ${body.context.timestamp} |\n`;
    issueBody += `| User Agent | ${body.context.userAgent.substring(0, 100)} |\n`;

    if (body.context.auditScore !== undefined) {
      issueBody += `| Audit Score | ${body.context.auditScore}/100 (${body.context.auditGrade}) |\n`;
    }

    if (body.context.consoleErrors && body.context.consoleErrors.length > 0) {
      issueBody += `\n## Console Errors\n\n\`\`\`\n${body.context.consoleErrors.join('\n')}\n\`\`\`\n`;
    }

    if (body.context.networkErrors && body.context.networkErrors.length > 0) {
      issueBody += `\n## Network Errors\n\n\`\`\`\n${body.context.networkErrors.join('\n')}\n\`\`\`\n`;
    }

    if (screenshotUrl) {
      issueBody += `\n## Screenshot\n\n[View screenshot](${screenshotUrl})\n`;
    }

    issueBody += `\n---\n*Submitted via WebScope feedback button*`;

    // Create GitHub Issue
    const ghResponse = await fetch('https://api.github.com/repos/salomaostudart/webscope/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WebScope-Feedback/1.0',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: [labels[body.type] || 'bug'],
      }),
    });

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      return jsonError(`GitHub API error: ${ghResponse.status}`, 502, cors);
    }

    const issue = await ghResponse.json() as { number: number; html_url: string };

    return new Response(JSON.stringify({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  } catch {
    return jsonError('Failed to process feedback.', 500, cors);
  }
}

// --- Screenshot handler ---

async function handleScreenshot(
  pathname: string,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const id = pathname.replace('/screenshot/', '');
  const data = await env.FEEDBACK_SCREENSHOTS.get(`screenshot:${id}`);

  if (!data) {
    return jsonError('Screenshot not found or expired.', 404, cors);
  }

  // Convert data URL to binary
  const base64 = data.split(',')[1];
  const mimeMatch = data.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] || 'image/png';
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  return new Response(binary, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=86400',
      ...cors,
    },
  });
}

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
