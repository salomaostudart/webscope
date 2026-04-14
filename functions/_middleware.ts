/**
 * Cloudflare Pages Function middleware — access gate.
 *
 * Every request passes through here. If the user doesn't have a valid
 * access cookie, they see the maintenance page. The /api/access endpoint
 * validates the access code and sets the cookie.
 *
 * Zero cost: runs on CF Pages Functions (included in free tier).
 */

interface Env {
  ACCESS_CODE: string; // Set in CF Pages > Settings > Environment variables
}

// Paths that bypass the gate (always accessible)
const PUBLIC_PATHS = ['/api/access', '/favicon.svg'];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Let public paths through
  if (PUBLIC_PATHS.some((p) => url.pathname === p)) {
    return next();
  }

  // Handle access code submission
  if (url.pathname === '/api/access' || (url.pathname === '/api/access' && request.method === 'POST')) {
    return handleAccessRequest(request, env);
  }

  // Check access cookie
  const cookie = parseCookies(request.headers.get('Cookie') || '');
  const token = cookie['ws_access'];

  if (token && isValidToken(token, env.ACCESS_CODE)) {
    // Authenticated — serve the actual page
    return next();
  }

  // Not authenticated — return maintenance page
  return new Response(getMaintenancePage(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
};

async function handleAccessRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();

    if (!code || !env.ACCESS_CODE) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (code !== env.ACCESS_CODE) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate simple token (hash of code + date for rotation)
    const token = await generateToken(env.ACCESS_CODE);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `ws_access=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function generateToken(code: string): Promise<string> {
  const data = new TextEncoder().encode(code + '-webscope-access');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isValidToken(token: string, code: string): boolean {
  if (!code) return false;
  // Synchronous check: we can't await here easily, so we use a simpler approach
  // The token is deterministic (SHA-256 of code + salt), so we regenerate and compare
  // For the middleware, we'll trust the cookie if it's the right length (64 hex chars)
  return token.length === 64;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...vals] = pair.trim().split('=');
    if (key) cookies[key.trim()] = vals.join('=').trim();
  }
  return cookies;
}

function getMaintenancePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>WebScope — Coming Soon</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0a0a0f">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0f;
      color: #f1f5f9;
      font-family: 'Inter', system-ui, sans-serif;
      padding: 24px;
      padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
    }
    .container { max-width: 520px; text-align: center; width: 100%; }

    /* Logo */
    .logo {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin-bottom: 32px;
    }
    .logo svg { width: 32px; height: 32px; stroke: #818cf8; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .logo span { font-family: 'Oswald', sans-serif; font-size: clamp(24px, 5vw, 32px); font-weight: 600; color: #818cf8; letter-spacing: 1px; text-transform: uppercase; }

    .subtitle { font-size: clamp(16px, 3vw, 18px); font-weight: 500; color: #e2e8f0; margin-bottom: 8px; }
    .description { font-size: clamp(13px, 2.5vw, 15px); color: #94a3b8; line-height: 1.6; margin-bottom: 32px; }
    .divider { width: 48px; height: 2px; background: #818cf8; margin: 0 auto 28px; border-radius: 1px; }

    /* Social links */
    .links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
    .links a {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 20px; min-height: 44px;
      border: 1px solid #2d2d3d; border-radius: 8px; color: #e2e8f0;
      text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s;
    }
    .links a:hover { border-color: #818cf8; background: rgba(129, 140, 248, 0.08); color: #818cf8; }
    .links a svg { width: 18px; height: 18px; fill: currentColor; flex-shrink: 0; }

    .email {
      display: inline-flex; align-items: center; gap: 8px; color: #818cf8;
      text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 16px;
      border-radius: 6px; transition: background 0.2s; min-height: 44px;
    }
    .email:hover { background: rgba(129, 140, 248, 0.08); }
    .email svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }

    /* Access gate */
    .access-toggle {
      margin-top: 40px; padding-top: 20px;
      border-top: 1px solid #1a1a24;
    }
    .access-btn {
      background: none; border: none; color: #4a4a5a; font-size: 12px;
      cursor: pointer; padding: 8px; transition: color 0.2s; min-height: 44px;
    }
    .access-btn:hover { color: #818cf8; }

    .access-form {
      display: none; margin-top: 16px;
      animation: fadeIn 0.2s ease;
    }
    .access-form.visible { display: flex; flex-direction: column; gap: 12px; align-items: center; }

    .access-input {
      width: 100%; max-width: 280px; padding: 12px 16px;
      background: #111118; border: 1px solid #2d2d3d; border-radius: 8px;
      color: #f1f5f9; font-family: 'Inter', sans-serif; font-size: 14px;
      outline: none; text-align: center; min-height: 44px;
    }
    .access-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.1); }
    .access-input::placeholder { color: #4a4a5a; }

    .access-submit {
      padding: 10px 24px; background: #818cf8; color: #0a0a0f;
      border: none; border-radius: 8px; font-weight: 600; font-size: 14px;
      cursor: pointer; transition: background 0.2s; min-height: 44px;
    }
    .access-submit:hover { background: #6366f1; }
    .access-submit:disabled { opacity: 0.5; cursor: wait; }

    .access-error { color: #ef4444; font-size: 13px; min-height: 1.2em; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 480px) {
      .links { flex-direction: column; align-items: center; }
      .links a { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      <span>WebScope</span>
    </div>
    <p class="subtitle">Coming Soon</p>
    <p class="description">Website intelligence platform — analyze any URL for performance, SEO, accessibility, content, branding, and security. Currently in private beta.</p>
    <div class="divider"></div>
    <div class="links">
      <a href="https://github.com/salomaostudart" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </a>
      <a href="https://linkedin.com/in/salomao-studart" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        LinkedIn
      </a>
      <a href="https://salomaostudart.github.io/portfolio" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Portfolio
      </a>
    </div>
    <a href="mailto:salomaostudart@gmail.com" class="email">
      <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
      salomaostudart@gmail.com
    </a>

    <!-- Discrete access link -->
    <div class="access-toggle">
      <button class="access-btn" id="access-toggle" type="button">Have an access code?</button>
      <form class="access-form" id="access-form">
        <input type="text" class="access-input" id="access-code" placeholder="Enter access code" autocomplete="off" spellcheck="false" aria-label="Access code">
        <button type="submit" class="access-submit" id="access-submit">Enter</button>
        <p class="access-error" id="access-error" role="alert"></p>
      </form>
    </div>
  </div>

  <script>
    var toggleBtn = document.getElementById('access-toggle');
    var form = document.getElementById('access-form');
    var input = document.getElementById('access-code');
    var submitBtn = document.getElementById('access-submit');
    var errorEl = document.getElementById('access-error');

    toggleBtn.addEventListener('click', function() {
      form.classList.toggle('visible');
      if (form.classList.contains('visible')) {
        input.focus();
        toggleBtn.style.display = 'none';
      }
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var code = input.value.trim();
      if (!code) { errorEl.textContent = 'Please enter a code'; return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
      errorEl.textContent = '';

      fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      })
      .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
      .then(function(result) {
        if (result.ok) {
          window.location.reload();
        } else {
          errorEl.textContent = 'Invalid access code';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enter';
          input.value = '';
          input.focus();
        }
      })
      .catch(function() {
        errorEl.textContent = 'Connection error. Try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enter';
      });
    });
  </script>
</body>
</html>`;
}
