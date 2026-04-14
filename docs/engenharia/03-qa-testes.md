# QA e Testes — WebScope

Praticas de qualidade, piramide de testes, cenarios, mocks, e definicao de "pronto".

---

## Piramide de testes

```
          /\
         /  \       E2E (Playwright)
        / E2E\      - Fluxo completo: home → analyze → report
       /------\     - Todas as paginas carregam
      /        \    - Acessibilidade WCAG 2.1 AA do PROPRIO site
     / Integr.  \   - Performance budget
    /------------\
   /              \  Unit (Vitest)
  /   Unit Tests   \ - Cada analyzer com dados mock
 /                  \ - HTML parser helpers
/____________________\ - Scoring/grading
                       - URL validation
                       - Formatters
```

**Prioridade:** unit tests > integration > E2E. Mais rapidos, mais baratos, mais estaveis.

---

## Quando rodar testes

| Momento | O que rodar | Comando |
|---|---|---|
| Antes de cada commit | Unit tests | `npm run test` |
| Antes de criar PR | Unit + Type check + Build | `npm run ci` |
| Antes de merge na main | Unit + Build + E2E | `npm run ci && npm run test:e2e` |
| Apos deploy | Smoke test manual | Verificar site no browser |
| Ao finalizar fase | Auditoria completa | 4 agentes (codigo, testes, seguranca, docs) |

---

## Unit Tests (Vitest)

### Estrutura de arquivos

```
tests/
  unit/
    analyzers/
      performance.test.ts     — PerformanceAnalyzer com mocks Lighthouse
      seo.test.ts              — SEOAnalyzer com mocks HTML
      accessibility.test.ts    — AccessibilityAnalyzer com mocks
      content.test.ts          — ContentAnalyzer com mocks
      branding.test.ts         — BrandingAnalyzer com mocks
      security.test.ts         — SecurityAnalyzer com mocks headers
      registry.test.ts         — Registry + runFullAudit
    utils/
      html-parser.test.ts      — Funcoes de parsing de HTML
      scoring.test.ts          — Calculo de grade e score ponderado
      formatters.test.ts       — Formatacao de numeros, datas
      url-validation.test.ts   — Validacao e normalizacao de URL
    lib/
      psi.test.ts              — Parsing de resposta da PSI API
      worker.test.ts           — Parsing de resposta do Worker
    mocks/
      lighthouse-good.json     — Resposta Lighthouse de site bom (score 95+)
      lighthouse-bad.json      — Resposta Lighthouse de site ruim (score <50)
      lighthouse-average.json  — Resposta Lighthouse de site medio (score ~70)
      html-good.html           — HTML completo com tudo certo
      html-bad.html            — HTML com muitos problemas
      html-minimal.html        — HTML quase vazio
      headers-good.json        — Headers com tudo configurado
      headers-bad.json         — Headers sem protecao
      headers-partial.json     — Headers parcialmente configurados
```

### Cenarios obrigatorios por analyzer

Cada analyzer DEVE ter testes para:

1. **Site bom** (score >= 90, grade A, 0 critical findings)
2. **Site ruim** (score < 50, grade F, multiplos critical findings)
3. **Site medio** (score ~70, grade C, mix de findings)
4. **Input vazio/incompleto** (HTML vazio, headers vazios, Lighthouse undefined)
5. **Edge cases** (valores extremos, dados malformados)

### Cenarios detalhados por analyzer

#### Performance Analyzer
- Score A para site com bom CWV (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- Score F para site com CWV ruim (LCP > 4s, CLS > 0.25)
- Finding `perf-lcp-slow` quando LCP > 4s (severity: critical)
- Finding `perf-page-size-large` quando pagina > 3MB
- Calculo correto de page weight breakdown
- Handle graceful quando Lighthouse retorna null/undefined

#### SEO Analyzer
- Flag missing title (severity: critical)
- Flag title muito longo (>60 chars, severity: warning)
- Flag meta description ausente (severity: critical)
- Detectar multiplos H1 (severity: warning)
- Detectar hierarquia de headings quebrada (H1 → H3, pulou H2)
- Detectar imagens sem alt (severity: critical)
- Detectar JSON-LD structured data
- Verificar Open Graph tags
- Handle HTML vazio/minimo

#### Security Analyzer
- Score A com todos os headers de seguranca presentes
- Flag HSTS ausente (severity: critical)
- Flag CSP ausente (severity: warning)
- Flag unsafe-inline em CSP (severity: warning)
- Detectar mixed content (HTTP em pagina HTTPS)
- Detectar server version leakage
- Flag HTTP (sem HTTPS) como critical

#### Scoring
- Grade correta para cada faixa (90+ = A, 80-89 = B, 70-79 = C, 50-69 = D, <50 = F)
- Calculo ponderado correto com pesos dos analyzers
- Ordenacao de findings por severity (critical > warning > info > pass)

#### HTML Parser
- Extrair title tag
- Extrair meta description
- Extrair headings em ordem
- Extrair imagens com e sem alt
- Extrair links internos e externos
- Extrair JSON-LD structured data
- Extrair Open Graph tags
- Handle HTML malformado sem crash

---

## Mocks de teste

### lighthouse-good.json
Resposta real da PageSpeed Insights API para um site bem otimizado. Capturar uma vez de um site real e salvar como fixture.
- Performance score: 95+
- Accessibility score: 95+
- SEO score: 95+
- LCP < 2s, CLS < 0.05, INP < 100ms

### lighthouse-bad.json
Resposta para site com problemas.
- Performance score < 50
- Accessibility score < 60
- SEO score < 50
- LCP > 5s, CLS > 0.3

### html-good.html
HTML completo com:
- `<title>` de 50 caracteres
- `<meta name="description">` de 150 caracteres
- `<meta name="viewport">`
- 1 `<h1>`, 3 `<h2>`, hierarquia correta
- Todas `<img>` com `alt` descritivo
- `<link rel="canonical">`
- Open Graph completo (og:title, og:description, og:image, og:url)
- JSON-LD Organization schema
- Links internos e externos com texto descritivo
- CTAs visiveis
- Favicon
- `<html lang="en">`
- `<main>`, `<nav>`, `<header>`, `<footer>` landmarks

### html-bad.html
HTML com problemas:
- Sem `<title>`
- Sem meta description
- 3 `<h1>`, hierarquia quebrada
- Imagens sem alt
- Links com texto generico ("clique aqui")
- Sem canonical
- Sem Open Graph
- Sem structured data
- Mixed content (src http:// em pagina https)
- Sem language attribute
- Sem landmarks

### headers-good.json
```json
{
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "content-security-policy": "default-src 'self'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
}
```

### headers-bad.json
```json
{
  "server": "Apache/2.4.51 (Ubuntu)",
  "x-powered-by": "Express 4.18.2"
}
```

---

## E2E Tests (Playwright)

### Cenarios obrigatorios

```
tests/e2e/
  home.spec.ts           — Home page carrega, input visivel, botao visivel
  url-validation.spec.ts — Input rejeita URLs invalidas, aceita validas
  audit-flow.spec.ts     — Fluxo completo: home → analyze → report (timeout longo)
  report.spec.ts         — Pagina de report renderiza score cards e radar
  drill-down.spec.ts     — Pagina de drill-down renderiza findings
  accessibility.spec.ts  — WCAG 2.1 AA do PROPRIO WebScope (axe-core)
  history.spec.ts        — Pagina de historico (requer login mock)
```

### Acessibilidade do proprio site

O WebScope analisa acessibilidade de OUTROS sites — entao o PROPRIO site deve ser exemplar.

```typescript
// tests/e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';

test('WebScope home passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('WebScope report page passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/report/test-id');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

## Definicao de "pronto" por fase

Uma fase so esta pronta quando:

1. Todos os testes passam (unit + E2E relevantes)
2. `npm run ci` passa sem erros (type-check + test + build)
3. Deployado em producao (main via squash merge)
4. Testado no browser (golden path + edge cases)
5. bugs-melhorias.md atualizado (se achados durante a fase)
6. Commits seguem conventional commits
7. PR mergeado via squash merge
8. Documentacao atualizada (se novos analyzers, paginas, ou APIs)

---

## Regression testing

Ao adicionar novo analyzer, verificar que:

1. Analyzers existentes continuam funcionando (testes passam)
2. Score geral ainda calcula corretamente com novo peso (soma = 100)
3. Radar chart renderiza com nova categoria
4. Pagina de relatorio mostra novo score card
5. Export inclui dados do novo analyzer
6. Nenhum finding duplicado entre analyzers

---

## Code review checklist (para cada PR)

- [ ] Testes unitarios cobrem o codigo novo
- [ ] Testes passando (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] ESLint sem erros (`npm run lint`)
- [ ] Type check passa (`npm run type-check`)
- [ ] Nenhum `console.log` em codigo de producao
- [ ] Nenhum `any` desnecessario em TypeScript
- [ ] Nenhum secret hardcoded
- [ ] Dados externos escapados (sem innerHTML)
- [ ] Componentes acessiveis (labels, alt, contrast)
- [ ] Responsivo testado em mobile
