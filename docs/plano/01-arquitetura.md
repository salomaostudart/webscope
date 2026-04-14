# WebScope — Arquitetura

## Fluxo principal

```
Usuario digita URL no input
        |
        v
[Frontend Astro]
        |
        v
[Cloudflare Worker — /api/fetch]
  - Recebe URL
  - Faz fetch da pagina (server-side, sem CORS)
  - Retorna: HTML completo, response headers, status code, redirect chain, timing
        |
        v
[Frontend recebe HTML + headers]
        |
        +---> [PageSpeed Insights API] (fetch paralelo)
        |       Retorna: Lighthouse JSON completo
        |
        v
[Analyzer Engine — roda no client]
  Recebe: { url, html, headers, lighthouse }
  Executa 6 analyzers em paralelo:
    1. PerformanceAnalyzer
    2. SEOAnalyzer
    3. AccessibilityAnalyzer
    4. ContentAnalyzer
    5. BrandingAnalyzer
    6. SecurityAnalyzer
        |
        v
[Score Engine]
  Calcula score geral ponderado (0-100, grade A-F)
  Agrega findings de todos os analyzers
  Ordena por severity: critical > warning > info > pass
        |
        v
[AI Suggestions Engine — via Supabase Edge Function]
  Envia findings resumidos pro Claude Haiku
  Recebe: resumo executivo, quick wins, priorizacao impacto x esforco
        |
        v
[Report UI]
  Renderiza: scores, charts, findings, sugestoes, export
        |
        v
[Supabase — persistencia]
  Salva audit + findings no banco (se usuario logado)
```

## Analyzer Pattern

Evolucao do Connector Pattern do growth-dashboard. Cada fonte de analise implementa a mesma interface.

### Interface principal

```typescript
// src/analyzers/base/analyzer.interface.ts

export interface AnalysisInput {
  url: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  redirectChain: string[];
  responseTime: number;
  lighthouse?: LighthouseResult;
}

export interface Finding {
  id: string;                    // ex: "seo-missing-meta-description"
  analyzer: AnalyzerName;        // ex: "seo"
  severity: 'critical' | 'warning' | 'info' | 'pass';
  category: string;              // ex: "Meta Tags"
  title: string;                 // ex: "Meta description ausente"
  description: string;           // ex: "A pagina nao tem meta description..."
  recommendation: string;        // ex: "Adicione uma meta description com 150-160 caracteres..."
  impact: 'high' | 'medium' | 'low';
  effort: 'quick-fix' | 'moderate' | 'complex';
  element?: string;              // seletor CSS do elemento afetado (opcional)
  value?: string;                // valor atual encontrado (opcional)
  expected?: string;             // valor esperado/recomendado (opcional)
  learnMoreUrl?: string;         // link pra documentacao (opcional)
}

export interface AnalyzerResult<T = unknown> {
  analyzer: AnalyzerName;
  score: number;                 // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  findings: Finding[];
  data: T;                       // dados especificos do analyzer (tipado)
  duration: number;              // tempo de analise em ms
}

export type AnalyzerName = 'performance' | 'seo' | 'accessibility' | 'content' | 'branding' | 'security';

export interface IAnalyzer<T = unknown> {
  readonly name: AnalyzerName;
  readonly displayName: string;
  readonly description: string;
  readonly weight: number;        // peso no score geral (soma = 100)
  analyze(input: AnalysisInput): Promise<AnalyzerResult<T>>;
}
```

### Pesos dos analyzers no score geral

| Analyzer | Peso | Justificativa |
|---|---|---|
| Performance | 20 | Core Web Vitals afetam ranking e UX |
| SEO | 25 | Maior impacto em visibilidade e trafego |
| Accessibility | 15 | Requisito legal e moral, afeta audience |
| Content | 15 | Qualidade do conteudo afeta conversao |
| Branding | 10 | Consistencia visual afeta credibilidade |
| Security | 15 | Headers e HTTPS afetam confianca e ranking |

### Calculo de grade

| Score | Grade |
|---|---|
| 90-100 | A |
| 80-89 | B |
| 70-79 | C |
| 50-69 | D |
| 0-49 | F |

### Registry

```typescript
// src/analyzers/registry.ts

import { PerformanceAnalyzer } from './performance/performance.analyzer';
import { SEOAnalyzer } from './seo/seo.analyzer';
import { AccessibilityAnalyzer } from './accessibility/accessibility.analyzer';
import { ContentAnalyzer } from './content/content.analyzer';
import { BrandingAnalyzer } from './branding/branding.analyzer';
import { SecurityAnalyzer } from './security/security.analyzer';

export const analyzers: IAnalyzer[] = [
  new PerformanceAnalyzer(),
  new SEOAnalyzer(),
  new AccessibilityAnalyzer(),
  new ContentAnalyzer(),
  new BrandingAnalyzer(),
  new SecurityAnalyzer(),
];

export async function runFullAudit(input: AnalysisInput): Promise<AuditResult> {
  const results = await Promise.all(
    analyzers.map(a => a.analyze(input))
  );

  const overallScore = results.reduce(
    (sum, r) => sum + (r.score * analyzers.find(a => a.name === r.analyzer)!.weight / 100),
    0
  );

  return {
    url: input.url,
    overallScore: Math.round(overallScore),
    overallGrade: scoreToGrade(overallScore),
    results,
    allFindings: results.flatMap(r => r.findings).sort(bySeverity),
    analyzedAt: new Date().toISOString(),
  };
}
```

## Cloudflare Worker (proxy)

O Worker e necessario porque o browser nao pode fazer fetch de URLs externas por CORS. O Worker roda server-side no edge da Cloudflare.

```typescript
// worker/src/index.ts (Cloudflare Worker)

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'url parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting basico
    // ...

    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'WebScope/1.0 (site-audit-tool)' },
      redirect: 'follow',
    });

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return new Response(JSON.stringify({
      html,
      headers,
      statusCode: response.status,
      url: response.url,         // URL final apos redirects
      responseTime: Date.now() - startTime,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://webscope.sal.dev.br',
      },
    });
  },
};
```

**Deploy do Worker:** `wrangler deploy` (separado do Pages). URL: `api-webscope.sal.dev.br` ou `webscope-api.workers.dev`.

## PageSpeed Insights API

API gratuita do Google que roda Lighthouse remotamente e retorna resultado completo.

**Endpoint:** `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
**Parametros:** `url`, `category` (performance, accessibility, seo, best-practices), `strategy` (mobile/desktop)
**Limite:** 25.000 requests/dia (gratis, sem API key). Com API key: 25.000/dia por chave.
**Tempo de resposta:** 10-30 segundos (Lighthouse roda no servidor do Google)

Chamada no frontend:
```typescript
const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function fetchLighthouse(url: string, strategy: 'mobile' | 'desktop' = 'mobile') {
  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
    category: 'accessibility',
    category: 'seo',
    category: 'best-practices',
  });

  const response = await fetch(`${PSI_URL}?${params}`);
  return response.json();
}
```

**Nota:** o PageSpeed Insights retorna tanto os scores do Lighthouse quanto os dados brutos (audits, diagnostics, opportunities). Os analyzers de Performance, SEO e Accessibility usam esses dados como input principal.

## Supabase

Mesma infra do growth-dashboard (mesmo projeto Supabase, tabelas diferentes).

- **Auth:** magic link (reutilizar setup existente)
- **PostgreSQL:** tabelas `audits` e `findings` (ver `09-schema-sql.md`)
- **Edge Functions:** proxy pra Claude Haiku (AI suggestions)
- **RLS:** ativo em todas as tabelas

## Estrutura de pastas do projeto

```
webscope/
  docs/
    plano/            ← documentos de planejamento (este diretorio)
  src/
    analyzers/
      base/           ← interface, schemas Zod, helpers
      performance/    ← PerformanceAnalyzer
      seo/            ← SEOAnalyzer
      accessibility/  ← AccessibilityAnalyzer
      content/        ← ContentAnalyzer
      branding/       ← BrandingAnalyzer
      security/       ← SecurityAnalyzer
      registry.ts     ← registra e executa todos os analyzers
    components/
      ui/             ← componentes reutilizaveis (ScoreCard, FindingCard, etc)
      charts/         ← componentes ECharts (RadarChart, GaugeChart, etc)
      layout/         ← Sidebar, Header, Footer
    layouts/
      BaseLayout.astro
      ReportLayout.astro
    lib/
      supabase.ts     ← client singleton
      psi.ts          ← PageSpeed Insights API client
      worker.ts       ← CF Worker API client
      ai.ts           ← AI suggestions client
    pages/
      index.astro     ← Home / Scanner
      login.astro
      history.astro
      about.astro
      report/
        [id].astro    ← Relatorio geral
        [id]/
          performance.astro
          seo.astro
          accessibility.astro
          content.astro
          branding.astro
          security.astro
    styles/
      tokens.css      ← design tokens (cores, fontes, espacamentos)
      global.css
    utils/
      scoring.ts      ← calculo de scores e grades
      html-parser.ts  ← DOM parsing helpers
      formatters.ts   ← formatacao de numeros, datas, etc
    mcp/
      server.ts       ← MCP server
    data/
      snapshots/      ← cache local de auditorias
  worker/
    src/
      index.ts        ← Cloudflare Worker (proxy)
    wrangler.toml
  supabase/
    functions/
      ai-suggestions/
        index.ts      ← Edge Function (Claude Haiku)
    .gitignore
  public/
    _headers          ← security headers CF Pages
    manifest.json     ← PWA manifest
    favicon.svg
  tests/
    unit/             ← testes unitarios (Vitest)
    e2e/              ← testes E2E (Playwright)
  .github/
    workflows/
      ci.yml          ← lint + test + build (quando Actions desbloqueado)
      deploy.yml      ← deploy CF Pages (quando Actions desbloqueado)
  .env.example
  .gitignore
  astro.config.mjs
  eslint.config.js
  package.json
  playwright.config.ts
  tsconfig.json
  vitest.config.ts
  CLAUDE.md           ← regras do projeto pro Claude Code
  README.md
  ANALYZERS.md        ← guia de analyzers (equivalente ao CONNECTORS.md)
  bugs-melhorias.md
```
