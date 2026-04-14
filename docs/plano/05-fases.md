# WebScope — Fases de Desenvolvimento

## Visao geral

| Fase | Conteudo | Branches | Resultado |
|---|---|---|---|
| 1 | Setup + Performance + SEO | `feature/project-setup`, `feature/performance-analyzer`, `feature/seo-analyzer` | 2 analyzers, deploy funcionando, testes |
| 2 | Accessibility + Content + Security | `feature/accessibility-analyzer`, `feature/content-analyzer`, `feature/security-analyzer` | 5 analyzers |
| 3 | Branding + AI Suggestions | `feature/branding-analyzer`, `feature/ai-suggestions` | 6 analyzers + IA |
| 4 | Auth + Historico + Polish | `feature/auth`, `feature/history`, `feature/polish` | v1 completa |
| 5 | MCP + Multi-URL + Automacao | `feature/mcp-server`, `feature/multi-url`, `feature/scheduling` | v2 features |
| 6 | Webflow-aware + Integracoes | `feature/webflow-aware`, `feature/growth-dashboard-link` | v2 features |
| 7 | Auditoria + Abertura | `chore/audit`, `chore/public-release` | Repo publico, auditado |

---

## Fase 1 — Setup + Performance + SEO

**Objetivo:** projeto funcional deployado com 2 analyzers e testes.

### Branch: `feature/project-setup`

1. **Criar projeto Astro 5**
   - `npm create astro@latest` com TypeScript strict
   - Copiar design tokens do growth-dashboard (cores, fontes, espacamentos)
   - Copiar `_headers` do growth-dashboard (security headers)
   - Configurar `astro.config.mjs` com `site: 'https://webscope.sal.dev.br'` e `output: 'static'`

2. **Instalar dependencias**
   - `echarts` (charts)
   - `zod` (validation)
   - `@supabase/supabase-js` (auth + db)
   - Dev: `vitest`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `eslint-plugin-astro`, `prettier`, `typescript-eslint`, `tsx`

3. **Configurar ferramentas**
   - `tsconfig.json` (strict)
   - `eslint.config.js` (flat config, astro plugin)
   - `.prettierrc`
   - `vitest.config.ts`
   - `playwright.config.ts`

4. **Layout base**
   - `BaseLayout.astro` com sidebar, header, theme toggle
   - `Sidebar.astro` com navegacao
   - `ThemeToggle.astro` com dark/light
   - CSS global com tokens
   - Fontes: Oswald + Inter via Google Fonts

5. **Pagina home**
   - Input de URL com validacao
   - Botao "Analyze"
   - Exemplos de URLs (growth.sal.dev.br, portfolio, landing pages)
   - "How it works" section

6. **Cloudflare Worker (proxy)**
   - Criar pasta `worker/` com Wrangler config
   - Worker que recebe URL, faz fetch, retorna HTML + headers
   - Rate limiting basico (IP-based)
   - CORS restrito a webscope.sal.dev.br
   - Deploy: `wrangler deploy`

7. **Infra base**
   - Criar repo GitHub (privado)
   - `.gitignore`, `.env.example`
   - `CLAUDE.md` com regras do projeto
   - `README.md` inicial
   - Deploy CF Pages (mesmo se pagina em branco)
   - Configurar subdominio webscope.sal.dev.br no Cloudflare

8. **Testes base**
   - Vitest config + primeiro test (URL validation)
   - Playwright config + test de home page carrega

**PR:** `feature/project-setup` → `main`
**Commit message:** `feat: project setup — Astro 5, design system, CF Worker proxy, deploy`

### Branch: `feature/performance-analyzer`

1. **Analyzer interface**
   - `src/analyzers/base/analyzer.interface.ts` — interfaces IAnalyzer, AnalysisInput, Finding, etc
   - `src/analyzers/base/analyzer.schema.ts` — schemas Zod
   - `src/analyzers/base/scoring.ts` — calculo de grade, pesos

2. **PageSpeed Insights client**
   - `src/lib/psi.ts` — fetch da API PSI com parametros corretos
   - Tipos TypeScript pra resposta do Lighthouse
   - Retry com backoff (PSI pode demorar 10-30s)
   - Cache basico (nao refazer PSI se ja tem resultado recente)

3. **CF Worker client**
   - `src/lib/worker.ts` — fetch do Worker proxy
   - Tipos TypeScript pra resposta

4. **Performance Analyzer**
   - `src/analyzers/performance/performance.analyzer.ts`
   - Implementa IAnalyzer<PerformanceData>
   - Extrai CWV, metricas, oportunidades, diagnosticos do Lighthouse
   - Gera findings baseados em thresholds
   - Score 0-100

5. **Registry**
   - `src/analyzers/registry.ts` — registra analyzer, executa audit

6. **UI do relatorio**
   - `src/pages/report/[id].astro` — pagina de relatorio geral
   - `ScoreCard.astro` — card com score/grade
   - `GradeCircle.astro` — circulo visual
   - `FindingCard.astro` — card expandivel
   - `GaugeChart.astro` — ECharts gauge
   - `RadarChart.astro` — ECharts radar (1 categoria por enquanto)

7. **Pagina de performance**
   - `src/pages/report/[id]/performance.astro`
   - CWV detalhado com gauges
   - Oportunidades de melhoria
   - Diagnosticos
   - Page weight breakdown

8. **Testes**
   - Unit: Performance Analyzer com dados mock do Lighthouse
   - Unit: Scoring (grade calculation)
   - Unit: PSI response parsing
   - E2E: home → analyze → report page loads

**PR:** `feature/performance-analyzer` → `main`
**Commit message:** `feat(perf): performance analyzer — CWV, Lighthouse integration, report UI`

### Branch: `feature/seo-analyzer`

1. **HTML Parser helpers**
   - `src/utils/html-parser.ts` — funcoes pra extrair meta tags, headings, links, images, structured data do HTML string
   - Usar DOMParser (browser) ou regex robusto pra server

2. **SEO Analyzer**
   - `src/analyzers/seo/seo.analyzer.ts`
   - Implementa IAnalyzer<SEOData>
   - Checks: meta tags, headings, links, images, structured data, crawlability, Open Graph
   - Score baseado em quantos checks passam vs total

3. **UI SEO**
   - `src/pages/report/[id]/seo.astro`
   - Meta tags status
   - Heading hierarchy visual
   - Links internos/externos
   - Images coverage
   - Open Graph preview card
   - Structured data found

4. **Radar chart atualizado**
   - Agora com 2 categorias (Performance + SEO)

5. **Testes**
   - Unit: SEO Analyzer com HTML mocks (pagina boa, pagina com problemas, pagina vazia)
   - Unit: HTML parser helpers
   - E2E: SEO drill-down page

**PR:** `feature/seo-analyzer` → `main`
**Commit message:** `feat(seo): SEO analyzer — meta tags, headings, links, images, structured data`

---

## Fase 2 — Accessibility + Content + Security

**Objetivo:** 5 de 6 analyzers funcionando.

### Branch: `feature/accessibility-analyzer`

1. **Accessibility Analyzer**
   - `src/analyzers/accessibility/accessibility.analyzer.ts`
   - Usa dados do Lighthouse (axe-core) + HTML parsing
   - Checks: language attr, alt text, contrast, form labels, landmarks, ARIA, keyboard, skip nav
   - Mapeia violations do Lighthouse pra findings do WebScope

2. **UI Accessibility**
   - `src/pages/report/[id]/accessibility.astro`
   - WCAG violations por impact
   - Landmarks presentes/ausentes
   - Contrast issues

3. **Testes**
   - Unit: A11y Analyzer com mocks
   - E2E: pagina de accessibility

**PR:** `feature/accessibility-analyzer` → `main`
**Commit message:** `feat(a11y): accessibility analyzer — WCAG 2.1 AA, landmarks, contrast, ARIA`

### Branch: `feature/content-analyzer`

1. **Content Analyzer**
   - `src/analyzers/content/content.analyzer.ts`
   - Checks: word count, readability, broken links, images, CTAs, FAQ, contact info, social links, favicon, 404 page
   - Readability: implementar Flesch-Kincaid simplificado ou usar heuristica (sentence length + word length)

2. **Link checker**
   - Verificar links internos e externos via HEAD request no Worker
   - Rate limiting pra nao abusar de sites externos
   - Timeout curto (5s por link)
   - Limitar a 50 links por auditoria (v1)

3. **UI Content**
   - `src/pages/report/[id]/content.astro`
   - Word count e readability score
   - Links status (tabela com broken links)
   - Images coverage
   - CTAs encontrados

4. **Testes**
   - Unit: Content Analyzer
   - Unit: Readability calculator
   - Unit: Link checker (mock)

**PR:** `feature/content-analyzer` → `main`
**Commit message:** `feat(content): content analyzer — readability, broken links, CTAs, images`

### Branch: `feature/security-analyzer`

1. **Security Analyzer**
   - `src/analyzers/security/security.analyzer.ts`
   - Usa response headers do Worker
   - Checks: HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, mixed content, SRI, cookies, server header
   - Cada header tem peso no score

2. **UI Security**
   - `src/pages/report/[id]/security.astro`
   - Headers checklist visual (presente/ausente com valores)
   - Mixed content list
   - Cookies analysis
   - Recomendacoes especificas por header

3. **Testes**
   - Unit: Security Analyzer com diferentes combinacoes de headers
   - E2E: pagina de security

**PR:** `feature/security-analyzer` → `main`
**Commit message:** `feat(security): security analyzer — headers, HTTPS, mixed content, cookies`

---

## Fase 3 — Branding + AI Suggestions

**Objetivo:** todos os 6 analyzers + sugestoes inteligentes.

### Branch: `feature/branding-analyzer`

1. **CSS/Style extractor**
   - Extrair cores de inline styles e `<style>` blocks
   - Extrair font-family declarations
   - Detectar Google Fonts via link tags
   - Detectar logo no header

2. **Branding Analyzer**
   - `src/analyzers/branding/branding.analyzer.ts`
   - Checks: logo, favicon, apple-touch-icon, OG image, color palette, font families, font loading, PWA manifest
   - Score baseado em cobertura de brand assets

3. **UI Branding**
   - `src/pages/report/[id]/branding.astro`
   - Color palette visual (swatches)
   - Font preview
   - Logo e favicon status
   - Manifest coverage

4. **Radar chart completo** — agora com 6 categorias

5. **Testes**
   - Unit: Branding Analyzer com mocks
   - Unit: CSS extractor

**PR:** `feature/branding-analyzer` → `main`
**Commit message:** `feat(branding): branding analyzer — colors, fonts, logo, manifest, OG`

### Branch: `feature/ai-suggestions`

1. **Supabase Edge Function**
   - `supabase/functions/ai-suggestions/index.ts`
   - Recebe findings resumidos
   - Envia pro Claude Haiku com prompt estruturado
   - Retorna: resumo executivo, quick wins (top 5), priorizacao impacto x esforco
   - Rate limit: 20 requests/hora por IP
   - Funciona sem login (gratis, limitado)

2. **AI client**
   - `src/lib/ai.ts` — client pra Edge Function
   - Fallback se Edge Function indisponivel (mostra findings sem IA)

3. **UI Quick Wins**
   - Secao no relatorio geral com top 5 sugestoes
   - Impact x Effort matrix (ECharts scatter plot)
   - AI Summary paragraph

4. **AI Branding deep analysis** (requer login)
   - Tom de voz
   - Sugestoes de copy
   - Consistencia de mensagem

5. **Testes**
   - Unit: AI prompt construction
   - Unit: AI response parsing
   - Integration: Edge Function com mock (se possivel)

**PR:** `feature/ai-suggestions` → `main`
**Commit message:** `feat: AI suggestions engine — quick wins, impact matrix, executive summary`

---

## Fase 4 — Auth + Historico + Polish

**Objetivo:** v1 completa, pronta pra mostrar.

### Branch: `feature/auth`

1. **Supabase Auth**
   - `src/lib/supabase.ts` — client singleton com graceful fallback
   - Login page (`/login`) com magic link
   - AuthGate component (mesmo pattern do growth-dashboard)
   - RoleBadge no sidebar (email + logout)

2. **Schema SQL**
   - Executar schema no Supabase (tabelas audits, findings)
   - RLS policies

3. **Persistencia de auditorias**
   - Salvar audit + findings no banco apos analise
   - Usuarios nao logados: audit roda mas nao persiste

**PR:** `feature/auth` → `main`

### Branch: `feature/history`

1. **Pagina de historico**
   - Lista de auditorias anteriores (tabela)
   - Filtro por dominio e periodo
   - Trend chart (score ao longo do tempo pra mesmo dominio)
   - Comparacao entre 2 auditorias

**PR:** `feature/history` → `main`

### Branch: `feature/polish`

1. **PWA**
   - Service worker
   - manifest.json
   - Offline cache de relatorios

2. **Command palette** (Ctrl+K)
   - Navegar entre paginas
   - Buscar por finding
   - Iniciar nova auditoria

3. **Export**
   - CSV (findings)
   - Markdown (relatorio completo)
   - PDF (via print CSS ou biblioteca)

4. **About page**
   - Metodologia
   - Stack
   - Scoring
   - Limitacoes

5. **README.md completo**
   - O que e, como instalar, como usar, arquitetura, screenshots

6. **ANALYZERS.md**
   - Guia de cada analyzer (equivalente ao CONNECTORS.md do growth-dashboard)

7. **Responsividade**
   - Testar todas as paginas em mobile
   - Ajustar sidebar colapsavel

8. **Performance do site**
   - ECharts tree-shaking
   - Lazy loading de charts
   - Prefetch de links

9. **Testes E2E completos**
   - Todas as paginas carregam
   - Fluxo completo: home → analyze → report → drill-down
   - Acessibilidade WCAG 2.1 AA do proprio site (axe-core)
   - Performance budget

10. **Auditoria do WebScope com o proprio WebScope**
    - Usar a ferramenta pra auditar a si mesma
    - Corrigir findings

**PR:** `feature/polish` → `main`

---

## Fase 5 — MCP + Multi-URL + Automacao (v2)

### Branch: `feature/mcp-server`

1. **MCP Server**
   - `src/mcp/server.ts`
   - Tools: `run_audit`, `get_audit`, `get_findings`, `get_score`, `compare_audits`, `list_audits`
   - `.mcp.json` config

### Branch: `feature/multi-url`

1. **Crawl de multiplas paginas**
   - Input: dominio + depth (1-3 niveis)
   - Worker faz crawl basico (extrai links internos)
   - Executa audit em cada pagina
   - Relatorio agregado por dominio

### Branch: `feature/scheduling`

1. **Agendamento**
   - Cron job (CF Worker ou Supabase) pra auditar URLs periodicamente
   - Webhook notification quando score cai abaixo de threshold
   - Email digest semanal

---

## Fase 6 — Webflow-aware + Integracoes (v2)

### Branch: `feature/webflow-aware`

1. **Detectar Webflow**
   - Identificar sites Webflow via meta tags, classes CSS, ou headers
   - Sugestoes especificas pra Webflow (custom code, CMS collections, etc)
   - Otimizacoes Webflow-specific

### Branch: `feature/growth-dashboard-link`

1. **Integracao com growth-dashboard**
   - Link bidirecional: metricas (growth-dashboard) + auditoria (WebScope)
   - Mesmo design system
   - Mesma auth (Supabase)

---

## Fase 7 — Auditoria + Abertura

### Branch: `chore/audit`

1. **Auditoria completa** (4 agentes paralelos em sonnet)
   - Engine/codigo
   - Testes
   - Seguranca (OWASP — usar PLANO_SEGURANCA_OWASP_ASTRO.md como guia)
   - Documentacao

2. **Corrigir todos os P0**
3. **Rodar gitleaks**
4. **Verificar .gitignore**

### Branch: `chore/public-release`

1. **Tornar repo publico**
2. **Verificar que nenhum secret esta no historico**
3. **Adicionar LICENSE**
4. **Badge no README** (build status, license)
