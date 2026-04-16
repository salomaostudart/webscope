# WebScope — Regras do Projeto

> Referencia tecnica do workspace: `hq/reference/boas-praticas.md` (Sec 1.3 HTML/CSS/JS, 2.3 integracao, 3.7 Cloudflare Workers)
> **Deps:** MAINTENANCE | Referencia: boas-praticas.md | Derivado de growth-dashboard
> **Registry:** hq/reference/dependencias.md

## O que e
Website intelligence platform — auditoria tecnica de qualquer URL publica.
6 categorias: Performance, SEO, Accessibility, Content, Branding, Security.
Scores 0-100, findings priorizados, sugestoes de IA.

## Stack
- **Framework:** Astro 6 + TypeScript (output estatico)
- **Charts:** Apache ECharts 6 (radar, gauge, bar)
- **Validacao:** Zod 4 (schema validation nos analyzers)
- **Testes:** Vitest (unit) + Playwright (E2E + a11y)
- **Design:** Oswald + Inter + JetBrains Mono + CSS tokens
- **Deploy:** Cloudflare Pages (webscope.sal.dev.br)
- **Proxy:** Cloudflare Worker (webscope-api)
- **Database:** Cloudflare D1 (SQLite, free tier)
- **IA:** Cloudflare Workers AI (Qwen3/Llama, free tier)
- **Cache:** Cloudflare KV (free tier)
- **Auth:** Auth.js + D1 adapter (futuro)

## Arquitetura
Analyzer Pattern — cada fonte de analise implementa `IAnalyzer<T>`.
- `src/analyzers/base/` — interfaces e schemas
- `src/analyzers/<nome>/` — cada analyzer
- `src/analyzers/registry.ts` — registra e executa todos

## Comandos
```bash
npm run dev        # Dev server (localhost:4321)
npm run build      # Build estatico
npm run test       # Unit tests (Vitest)
npm run test:e2e   # E2E (Playwright)
npm run type-check # TypeScript check (astro check)
npm run lint       # ESLint (src/)
npm run ci         # type-check + test + build
npm run deploy     # CI + deploy CF Pages
```

## Worker (proxy)
```bash
cd worker && npm run dev    # Dev worker local
cd worker && npm run deploy # Deploy worker
```

## Commits
- Prefixos: `feat:` `fix:` `docs:` `test:` `chore:` `refactor:`
- Escopos: `(perf)` `(seo)` `(a11y)` `(content)` `(branding)` `(security)` `(ui)` `(worker)` `(mcp)` `(auth)` `(ci)`
- Atomicos, descritivos
- Rodar `npm run test` antes de commitar

## Git Workflow
- **GitHub Flow:** main = producao. Toda mudanca via feature branch + PR + squash merge.
- **Nunca commitar direto na main.** Criar branch `feature/`, `fix/`, `docs/`, etc.
- Conventional commits obrigatorios (ver `docs/engenharia/01-git-workflow.md`)
- Rodar `npm run ci` antes de criar PR
- GitHub Actions: workflows em `.github/workflows/` (bloqueado, rodar CI manualmente)

## Regras
- Nao commitar secrets (.env, API keys)
- Todo HTML externo escapado (sem innerHTML)
- Acessibilidade WCAG 2.1 AA obrigatoria
- Worker valida URLs (anti-SSRF)
- Testes devem passar antes de qualquer merge (`npm run ci`)

## Documentacao de engenharia
- `docs/plano/` — O QUE construir (produto, features, fases, arquitetura)
- `docs/engenharia/` — COMO construir (git workflow, OWASP, QA, CI/CD, boas praticas, deploy)

Ao entrar no projeto, ler CLAUDE.md + docs relevantes para a tarefa.
Para entendimento completo: ler `docs/engenharia/00-indice.md`.
