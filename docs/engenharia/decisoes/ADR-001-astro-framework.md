# ADR-001 — Astro como framework principal

**Data:** 14/04/2026
**Status:** Aceito

## Contexto

WebScope precisa de um framework web para servir paginas estaticas com charts interativos, formulario de input e resultados de auditoria. Opcoes avaliadas: Next.js, Astro, SvelteKit.

## Opcoes consideradas

### Opcao A — Next.js
**Pros:** ecossistema enorme, SSR/SSG flexivel, React components, mercado de trabalho
**Contras:** JS bundle pesado por padrao, overhead de React para paginas que nao precisam, complexidade de roteamento

### Opcao B — Astro
**Pros:** zero JS por padrao, output estatico, TypeScript nativo, Island Architecture, mesma stack do growth-dashboard (reutilizacao de design system e patterns)
**Contras:** menos familiar para recrutadores, componentes .astro nao sao React/Vue

### Opcao C — SvelteKit
**Pros:** performance excelente, sintaxe simples, bundle pequeno
**Contras:** ecossistema menor, nao reutiliza nada do growth-dashboard, curva de aprendizado

## Decisao

Astro 6 (mesma versao do growth-dashboard).

**Por que:**
1. **Reutilizacao real** — design tokens, CSS, patterns de componentes, configs, ECharts setup, Supabase client — tudo vem do growth-dashboard
2. **Zero JS desnecessario** — auditoria e analise sao leitura de dados, nao interacao complexa. Astro entrega HTML puro onde nao precisa de JS
3. **Static output** — sem servidor, deploy direto no CF Pages, seguranca maxima (superficie de ataque minima)
4. **TypeScript strict** — type safety nos analyzers, schemas Zod, interfaces tipadas
5. **Demonstra consistencia** — growth-dashboard + WebScope com mesma stack mostra dominio da tecnologia

## Consequencias

- Componentes de UI sao `.astro` (nao React/Vue) — menos portaveis mas mais simples
- Interatividade client-side via `<script>` tags (ECharts, theme toggle, form handling)
- Output estatico significa sem SSR — dados buscados via APIs no client (PSI, Worker)
- Requer Node.js 22+
