# Boas Praticas de Desenvolvimento — WebScope

Praticas de full-stack development aplicadas ao projeto.

---

## TypeScript

### Strict mode obrigatorio
- `tsconfig.json` extende `astro/tsconfigs/strict`
- Nenhum `any` desnecessario — usar tipos explicitos
- Interfaces definidas para todos os dados (AnalysisInput, Finding, AnalyzerResult)
- Zod schemas para validacao em runtime (complementa type safety em compile time)

### Convencoes de nomes
- Arquivos: `kebab-case.ts` (ex: `html-parser.ts`, `url-validation.ts`)
- Interfaces: `PascalCase` com prefixo `I` para interfaces de contrato (ex: `IAnalyzer`)
- Types: `PascalCase` (ex: `AnalyzerResult`, `Finding`, `Grade`)
- Funcoes: `camelCase` (ex: `scoreToGrade`, `extractTitle`)
- Constantes: `UPPER_SNAKE_CASE` (ex: `RATE_LIMIT`, `PRIVATE_RANGES`)
- Enums: `PascalCase` para o enum, `camelCase` ou `kebab-case` para valores

### Organizacao de imports
```typescript
// 1. Modulos externos
import { z } from 'zod';

// 2. Modulos internos (absolutos)
import type { IAnalyzer, AnalysisInput } from '../base/analyzer.interface';

// 3. Tipos (separados)
import type { SEOData } from './seo.types';
```

### Error handling
- Funcoes que podem falhar retornam `Result<T>` ou usam try/catch com tipo de erro definido
- Nunca engolir erros silenciosamente (`catch {}` vazio)
- Nunca expor stack traces ao usuario — mensagens de erro genericas na UI
- Log de erros com contexto suficiente para debug

---

## Astro

### Static-first
- Output: `static` (sem SSR) — reduz superficie de ataque e melhora performance
- Prefetch: hover strategy (pre-carrega links quando mouse passa por cima)
- Inline scripts: minimizar, preferir arquivos separados quando possivel

### Componentes
- `.astro` para componentes estaticos (sem estado client-side)
- Scripts client-side via `<script>` tags no componente (nao inline em `{}`)
- CSS escopado por padrao (Astro adiciona data attributes)
- Slots para composicao de layout

### Seguranca em Astro
- `{}` escapa HTML automaticamente — SEMPRE usar para dados externos
- NUNCA usar `set:html` ou `is:raw` com dados que vem de fora
- Fragment (`<Fragment>`) e seguro para composicao
- `is:inline` para scripts que precisam rodar antes do hydration (ex: theme)

---

## CSS

### Design tokens
- Todas as cores, espacamentos, fontes definidos como CSS custom properties em `tokens.css`
- Nunca usar valores hardcoded — sempre referenciar tokens
- Dark mode via `data-theme="light"` no `<html>` (redefinicao de tokens)

### Responsividade
- Mobile-first: estilos base para mobile, media queries para desktop
- Breakpoints: 480px (small), 768px (medium), 1024px (large)
- Touch targets: minimo 44x44px em elementos interativos (WCAG 2.5.8)
- Sidebar colapsavel em mobile

### Nomes de classes
- BEM-like: `.component-name`, `.component-name__element`, `.component-name--modifier`
- Ou descritivos simples quando escopados por Astro: `.hero-title`, `.nav-link`
- Evitar classes utilitarias genericas (preferir tokens CSS)

---

## Acessibilidade (WCAG 2.1 AA)

O WebScope analisa acessibilidade de outros sites — o proprio site DEVE ser exemplar.

### Obrigatorio em todo componente

- [ ] `lang` no `<html>` tag
- [ ] Landmarks semanticos: `<main>`, `<nav>`, `<header>`, `<footer>`
- [ ] Headings em hierarquia correta (H1 → H2 → H3, sem pular)
- [ ] Alt text em todas as imagens (ou `alt=""` para decorativas)
- [ ] Labels em todos os inputs (`<label>` associado ou `aria-label`)
- [ ] Focus indicators visiveis (`:focus-visible` com outline)
- [ ] Contraste minimo: 4.5:1 texto normal, 3:1 texto grande
- [ ] Skip navigation link no topo (se necessario)
- [ ] Keyboard navigation funcional (tab order logico, sem trap)
- [ ] `aria-current="page"` no link ativo da navegacao
- [ ] `role="alert"` em mensagens de erro dinamicas
- [ ] `aria-live="polite"` em conteudo que muda dinamicamente

### Testes de acessibilidade

- axe-core via Playwright (E2E) — roda em todas as paginas
- Teste manual: navegar todo o site so com teclado
- Teste manual: verificar com leitor de tela (NVDA ou VoiceOver)

---

## Performance

### Build
- Astro gera HTML estatico — zero JS desnecessario
- ECharts: importar apenas modulos necessarios (tree-shaking)
- Fontes: Google Fonts com `display=swap` e `preconnect`
- Imagens: SVG para icones, WebP para screenshots

### Runtime
- Lazy loading de charts (ECharts carregado on-demand quando componente entra no viewport)
- Skeleton loaders durante carregamento de dados (PSI demora 10-30s)
- Cache de resultados do Worker (nao re-auditar mesma URL em < 5 min)
- Prefetch de links (hover strategy do Astro)

### Metricas alvo do proprio site
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms
- Total page weight < 500KB (excluindo ECharts lazy)

---

## Seguranca no codigo

### Nunca
- `innerHTML` com dados externos
- `eval()`, `new Function()` com dados do usuario
- `http://` em producao (exceto localhost em dev)
- Secrets hardcoded em qualquer arquivo
- `console.log` com dados sensiveis
- `any` como escape de type safety em dados externos
- Ignorar erros de validacao Zod

### Sempre
- Escapar dados externos via `{}` do Astro
- Validar URLs antes de fetch (anti-SSRF)
- Rate limiting em endpoints publicos
- Timeout em requests externos
- Limite de tamanho em respostas
- try/catch com erro tratado (nao vazio)
- Zod para validar respostas de APIs externas

---

## Organizacao de codigo

### Principio: cada coisa no seu lugar

```
src/
  analyzers/      ← Logica de analise (puro TypeScript, sem UI)
  components/     ← Componentes visuais (.astro)
    layout/       ← Sidebar, Header, ThemeToggle
    ui/           ← ScoreCard, FindingCard, GradeCircle
    charts/       ← RadarChart, GaugeChart, BarChart
  layouts/        ← Layouts de pagina (BaseLayout, ReportLayout)
  lib/            ← Clients de APIs (supabase, psi, worker, ai)
  pages/          ← Rotas (cada .astro = uma pagina)
  styles/         ← CSS global e tokens
  utils/          ← Funcoes utilitarias puras (scoring, parsing, formatacao)
```

### Principio: analyzers sao independentes

Cada analyzer e um modulo que:
- Implementa a mesma interface (`IAnalyzer<T>`)
- Nao depende de outro analyzer
- Pode ser testado isoladamente com dados mock
- Retorna dados tipados (`AnalyzerResult<T>`)

Adicionar um analyzer novo = criar pasta + implementar interface + registrar + testar.

### Principio: separacao de concerns

- **Analyzers** (src/analyzers/) → logica de analise, scoring, findings
- **Lib** (src/lib/) → comunicacao com APIs externas
- **Utils** (src/utils/) → funcoes utilitarias puras (sem side effects)
- **Pages** (src/pages/) → roteamento e composicao de componentes
- **Components** (src/components/) → renderizacao visual
- **Worker** (worker/) → proxy server-side (projeto separado)
