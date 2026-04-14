# WebScope — Visao Geral

## O que e

WebScope e uma plataforma web que recebe qualquer URL e gera um relatorio visual completo com auditoria tecnica, SEO, acessibilidade, conteudo, branding, seguranca e sugestoes priorizadas por IA.

Funciona como:
1. **Ferramenta real** — para auditar os proprios sites do usuario (landing pages, portfolio, sites de clientes)
2. **Portfolio tecnico** — demonstra competencias alinhadas com vagas de Digital Growth, Marketing Systems e Web Leadership
3. **Complemento ao growth-dashboard** — o growth-dashboard mostra "como estamos indo?" (metricas). O WebScope mostra "o que esta errado e como melhorar?" (auditoria + acao)

## Nomes e URLs

- **Projeto:** WebScope
- **Pasta:** `~/Desktop/Projetos/webscope/`
- **Repo GitHub:** `salomaostudart/webscope` (privado inicialmente, publico quando pronto)
- **Deploy:** Cloudflare Pages — `webscope.sal.dev.br`
- **MCP config name:** `webscope`

## Stack

| Tecnologia | Funcao | Por que |
|---|---|---|
| **Astro 5** | Framework | Output estatico, TypeScript nativo, zero JS desnecessario. Mesma stack do growth-dashboard |
| **TypeScript** | Linguagem | Type safety, intellisense, refactor seguro |
| **Apache ECharts 6** | Charts | Radar chart pra scores, gauge pra metricas individuais, bar chart pra comparacoes |
| **Zod 4** | Validacao | Schema validation nas respostas de APIs e dados de analise |
| **Cloudflare Pages** | Deploy | Mesma infra do growth-dashboard, subdominio sal.dev.br |
| **Cloudflare Workers** | Proxy | Fetch de URLs externas (evita CORS do browser) |
| **Supabase** | Backend | Auth (magic link) + PostgreSQL (historico de auditorias) + Edge Functions (IA) |
| **Claude Haiku** | IA | Sugestoes de melhoria, resumo executivo, priorizacao inteligente |
| **Vitest** | Testes unitarios | Rapido, nativo TypeScript |
| **Playwright** | Testes E2E | Cross-browser, acessibilidade (axe-core), performance |
| **ESLint + Prettier** | Linting/Formatting | Consistencia de codigo |

## Design

Reutilizar do growth-dashboard:
- Fontes: Oswald (headings) + Inter (body)
- CSS tokens: cores, espacamentos, sombras, border-radius
- Layout: sidebar navigation + main content area
- Dark/light mode toggle com localStorage
- Skeleton loaders durante carregamento
- Command palette (Ctrl+K)

## Metricas de sucesso do projeto

- 6 analyzers funcionando com scores 0-100
- Relatorio visual completo para qualquer URL publica
- Sugestoes de IA priorizadas por impacto x esforco
- Historico de auditorias com comparacao temporal
- Testes unitarios + E2E cobrindo todos os analyzers
- Deploy em producao com HTTPS, headers de seguranca, PWA
- MCP server com tools de auditoria
- Documentacao completa (README, CONNECTORS equivalent, About page)
