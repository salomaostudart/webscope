# WebScope — O que reutilizar do growth-dashboard

## Copiar diretamente

Estes arquivos/patterns podem ser copiados do growth-dashboard com pouca ou nenhuma modificacao:

### Infra e config

| Arquivo | Caminho no growth-dashboard | Adaptar |
|---|---|---|
| `_headers` | `public/_headers` | Ajustar CSP connect-src (adicionar Worker URL, remover GA4) |
| `.gitignore` | `.gitignore` | Adicionar `worker/` |
| `astro.config.mjs` | `astro.config.mjs` | Mudar site URL |
| `.prettierrc` | `.prettierrc` | Copiar identico |
| `eslint.config.js` | `eslint.config.js` | Copiar identico |
| `tsconfig.json` | `tsconfig.json` | Copiar identico |
| `vitest.config.ts` | `vitest.config.ts` | Copiar identico |
| `playwright.config.ts` | `playwright.config.ts` | Copiar identico |

### Design

| Elemento | O que copiar | Onde no growth-dashboard |
|---|---|---|
| CSS tokens | Cores, espacamentos, sombras, border-radius | `src/styles/` (extrair de global.css ou tokens) |
| Fontes | Google Fonts link (Oswald + Inter) | `src/layouts/Layout.astro` (head) |
| Dark/light mode | Toggle + localStorage + CSS vars | `src/components/ThemeToggle.astro` |
| Skeleton loaders | Animacao pulse | `src/styles/` ou componente dedicado |

### Componentes (adaptar)

| Componente | Funcao no growth-dashboard | Funcao no WebScope |
|---|---|---|
| `Sidebar` | Navegacao entre paginas | Navegacao entre paginas + categorias |
| `CommandPalette` | Ctrl+K fuzzy search | Ctrl+K pra paginas + findings |
| `ThemeToggle` | Dark/light switch | Identico |
| `DataSourceTag` | "Live" / "Mock" badge | "API" / "Parsed" / "AI" badge |
| `ExportButton` | Download CSV | Download CSV/MD/PDF |
| `Tooltip` | Hover info | Identico |

### Patterns de codigo

| Pattern | Onde no growth-dashboard | Equivalente no WebScope |
|---|---|---|
| Connector Pattern | `src/connectors/base/connector.interface.ts` | Analyzer Pattern (`src/analyzers/base/analyzer.interface.ts`) |
| Registry | `src/connectors/registry.ts` | `src/analyzers/registry.ts` |
| Zod schemas | `src/connectors/base/connector.schema.ts` | `src/analyzers/base/analyzer.schema.ts` |
| Supabase client | `src/lib/supabase.ts` | Copiar com graceful fallback |
| MCP server structure | `src/mcp/server.ts` | Mesma estrutura, tools diferentes |
| Insights Engine | `src/utils/insights.ts` | Score Engine + AI Suggestions |
| Report Generator | `src/utils/report-generator.ts` | Adaptar pra gerar relatorio de auditoria |

### Scripts de deploy

| Script | package.json |
|---|---|
| `dev` | `astro dev` |
| `build` | `astro build` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `lint` | `eslint src/` |
| `type-check` | `astro check` |
| `ci` | `astro check && vitest run && astro build` |
| `deploy` | `npm run ci && npx wrangler pages deploy dist --project-name webscope --branch main` |

## NAO copiar

| Elemento | Motivo |
|---|---|
| Dados mock dos connectors | WebScope nao tem dados mock — analisa URLs reais |
| Charts especificos (traffic trend, channel mix, Sankey) | WebScope tem charts diferentes (radar, gauge, bar) |
| Auth whitelist (rapidcanvas.ai) | WebScope e ferramenta publica |
| GA4/GSC fetch scripts | WebScope usa PSI API + Worker, nao GA4/GSC diretamente |
| PWA manifest content | Nome, descricao, cores diferentes |
| README content | Projeto diferente |
| CLAUDE.md content | Regras especificas do WebScope |

## Relacao entre os dois projetos

```
growth-dashboard                    webscope
+------------------+               +------------------+
| "Como estamos    |               | "O que esta      |
|  indo?"          |               |  errado e como   |
|                  |               |  melhorar?"      |
| - Metricas GA4   |               | - Performance    |
| - Metricas GSC   |               | - SEO audit      |
| - Email mkt      |   Mesma       | - Accessibility  |
| - Social media   |   stack       | - Content check  |
| - CRM/Pipeline   |   Mesma       | - Branding eval  |
| - Martech health |   identidade  | - Security scan  |
| - AI chat        |   visual      | - AI suggestions |
| - MCP (13 tools) |               | - MCP (8 tools)  |
+------------------+               +------------------+
         |                                   |
         +------- Mesma Supabase ------+
         +------- Mesmo CF Pages ------+
         +------- Mesmo design ---------+
```

No futuro (Fase 6), os dois projetos podem ser linkados:
- growth-dashboard mostra link "Audit this site" → abre WebScope
- WebScope mostra link "View metrics" → abre growth-dashboard
- Mesma auth Supabase (SSO implicito)
