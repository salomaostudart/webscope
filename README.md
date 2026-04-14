# WebScope

Website intelligence platform — analyze any URL for performance, SEO, accessibility, content, branding, and security.

**Live:** [webscope.sal.dev.br](https://webscope.sal.dev.br) (private beta)

## What It Does

Enter any public URL and get a comprehensive audit report with:

- **6 analysis categories** — Performance, SEO, Accessibility, Content, Branding, Security
- **81+ automated checks** — Core Web Vitals, meta tags, WCAG, headers, color palette, and more
- **AI-powered suggestions** — quick wins prioritized by impact/effort (Cloudflare Workers AI)
- **Scores & grades** — 0–100 score with A–F grades per category
- **Export** — CSV, Markdown, PDF
- **Share links** — unique URL for each audit result
- **Temporal comparison** — track score changes between audits
- **Feedback reporting** — screenshot capture + console errors → GitHub Issues

## Stack

100% Cloudflare free tier — zero hosting cost.

| Technology | Role |
|---|---|
| [Astro 6](https://astro.build) | Static site framework (TypeScript) |
| [Apache ECharts 6](https://echarts.apache.org) | Radar charts, bar charts |
| [Zod 4](https://zod.dev) | Schema validation |
| [Cloudflare Pages](https://pages.cloudflare.com) | Hosting + edge functions |
| [Cloudflare Workers](https://workers.cloudflare.com) | Proxy API, AI, feedback |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite database (audit history) |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) | AI suggestions (Qwen2.5) |
| [Cloudflare KV](https://developers.cloudflare.com/kv/) | Screenshot storage |
| [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) | Lighthouse data |

## Architecture

```
User enters URL
    |
    v
[CF Worker proxy] ← fetch HTML + headers (anti-SSRF, rate limited)
[PSI API]         ← Lighthouse audit (parallel)
    |
    v
[6 Analyzers]     ← run in browser (Performance, SEO, A11y, Content, Branding, Security)
    |
    v
[Report UI]       ← scores, radar chart, findings, drill-down pages
[Workers AI]      ← quick wins, executive summary (async)
[D1 Database]     ← persist audit + generate share link
```

## Development

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Run tests
npm run test

# Full CI pipeline (type-check + test + build)
npm run ci

# Deploy
npm run deploy
```

## Worker (proxy API)

```bash
cd worker
npm install
npm run dev     # local dev
npm run deploy  # deploy to Cloudflare
```

## Project Structure

```
src/
  analyzers/        — 6 analysis modules (IAnalyzer<T> pattern)
  components/       — UI components (ScoreCard, FindingCard, CommandPalette, etc.)
  layouts/          — BaseLayout, DrillDownLayout
  lib/              — API clients (scanner, psi, worker, ai, db)
  pages/            — 10 routes (home, report, 6 drill-downs, history, about)
  styles/           — CSS tokens, global styles, print styles
  utils/            — scoring, html-parser, export, sanitize
worker/             — Cloudflare Worker (proxy, AI, feedback, D1)
functions/          — CF Pages Functions (access gate middleware)
docs/
  plano/            — product planning (vision, architecture, phases)
  engenharia/       — engineering practices (git, OWASP, QA, CI/CD, ADRs)
```

## Security

- OWASP Top 10 audit completed (15 vulnerabilities fixed)
- Anti-SSRF URL validation (private IPs, IPv6, CGNAT, reserved ranges)
- XSS prevention (escapeHtml on all external data)
- CSP headers, HSTS, X-Frame-Options
- Rate limiting on all endpoints
- gitleaks clean (zero secrets in history)
- See `docs/engenharia/02-seguranca-owasp.md` for full details

## Tests

168 unit tests covering all 6 analyzers, HTML parser, scoring, URL validation, and export.

```bash
npm run test        # unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
```

## License

MIT

## Author

[Salomao Studart](https://salomaostudart.github.io/portfolio) — [GitHub](https://github.com/salomaostudart) · [LinkedIn](https://linkedin.com/in/salomao-studart)
