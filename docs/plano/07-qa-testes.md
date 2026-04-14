# WebScope — QA e Testes

## Estrategia de testes

### Piramide de testes

```
        /\
       /  \       E2E (Playwright)
      / E2E\      - Fluxo completo: home → analyze → report
     /------\     - Todas as paginas carregam
    /        \    - Acessibilidade WCAG 2.1 AA
   / Integr.  \   - Performance budget
  /------------\
 /              \  Unit (Vitest)
/   Unit Tests   \ - Cada analyzer com dados mock
/________________\ - HTML parser helpers
                   - Scoring/grading
                   - URL validation
                   - Formatters
```

### Quando rodar

| Momento | O que rodar | Comando |
|---|---|---|
| Antes de cada commit | Unit tests | `npm run test` |
| Antes de cada PR | Unit + Build | `npm run ci` |
| Antes de merge na main | Unit + Build + E2E | `npm run ci && npm run test:e2e` |
| Apos deploy | Smoke test manual | Verificar site no browser |
| Ao finalizar fase | Auditoria completa | 4 agentes (codigo, testes, seguranca, docs) |

## Unit Tests (Vitest)

### Estrutura

```
tests/
  unit/
    analyzers/
      performance.test.ts
      seo.test.ts
      accessibility.test.ts
      content.test.ts
      branding.test.ts
      security.test.ts
      registry.test.ts
    utils/
      html-parser.test.ts
      scoring.test.ts
      formatters.test.ts
      url-validation.test.ts
    lib/
      psi.test.ts
      worker.test.ts
    mocks/
      lighthouse-good.json       ← resposta Lighthouse de site bom
      lighthouse-bad.json        ← resposta Lighthouse de site ruim
      lighthouse-average.json    ← resposta Lighthouse de site medio
      html-good.html             ← HTML com tudo certo
      html-bad.html              ← HTML com muitos problemas
      html-minimal.html          ← HTML minimo (quase vazio)
      headers-good.json          ← headers com tudo configurado
      headers-bad.json           ← headers sem protecao
      headers-partial.json       ← headers parcialmente configurados
```

### Cenarios por analyzer

#### Performance Analyzer Tests
```typescript
describe('PerformanceAnalyzer', () => {
  it('should score A for site with good CWV', async () => {
    // Input: lighthouse-good.json
    // Expected: score >= 90, grade A, 0 critical findings
  });

  it('should score F for site with bad CWV', async () => {
    // Input: lighthouse-bad.json
    // Expected: score < 50, grade F, multiple critical findings
  });

  it('should generate finding for LCP > 4s', async () => {
    // Input: lighthouse com LCP = 5.2s
    // Expected: finding perf-lcp-slow, severity critical
  });

  it('should generate finding for large page size', async () => {
    // Input: lighthouse com totalByteWeight > 3MB
    // Expected: finding perf-page-size-large
  });

  it('should handle missing Lighthouse data gracefully', async () => {
    // Input: lighthouse = undefined
    // Expected: score 0, info finding "Lighthouse unavailable"
  });

  it('should calculate correct page weight breakdown', async () => {
    // Input: lighthouse com resource summary
    // Expected: pageWeight com html, css, js, images, fonts, other
  });
});
```

#### SEO Analyzer Tests
```typescript
describe('SEOAnalyzer', () => {
  it('should score A for well-optimized page', async () => {
    // Input: html-good.html com title, meta desc, H1, alt text, schema
    // Expected: score >= 90
  });

  it('should flag missing title', async () => {
    // Input: HTML sem <title>
    // Expected: finding seo-missing-title, severity critical
  });

  it('should flag title too long', async () => {
    // Input: HTML com <title> de 80 caracteres
    // Expected: finding seo-title-too-long, severity warning
  });

  it('should flag missing meta description', async () => {
    // Expected: finding seo-missing-meta-description, severity critical
  });

  it('should detect multiple H1 tags', async () => {
    // Input: HTML com 3 <h1>
    // Expected: finding seo-multiple-h1, severity warning
  });

  it('should detect broken heading hierarchy', async () => {
    // Input: HTML com H1 → H3 (pulou H2)
    // Expected: finding seo-heading-hierarchy, severity warning
  });

  it('should detect images without alt', async () => {
    // Input: HTML com 5 <img>, 2 sem alt
    // Expected: finding seo-images-without-alt, severity critical
  });

  it('should detect JSON-LD structured data', async () => {
    // Input: HTML com <script type="application/ld+json">
    // Expected: structuredData com type e valid
  });

  it('should check Open Graph tags', async () => {
    // Input: HTML com og:title, og:description, og:image
    // Expected: openGraph preenchido, nenhum finding OG
  });

  it('should handle empty/minimal HTML', async () => {
    // Input: html-minimal.html (so <html><body></body></html>)
    // Expected: score baixo, muitos findings criticos
  });
});
```

#### Security Analyzer Tests
```typescript
describe('SecurityAnalyzer', () => {
  it('should score A for site with all security headers', async () => {
    // Input: headers-good.json
    // Expected: score >= 90, grade A
  });

  it('should flag missing HSTS', async () => {
    // Input: headers sem Strict-Transport-Security
    // Expected: finding sec-missing-hsts, severity critical
  });

  it('should flag missing CSP', async () => {
    // Expected: finding sec-missing-csp, severity warning
  });

  it('should flag unsafe-inline in CSP', async () => {
    // Input: headers com CSP contendo 'unsafe-inline' em script-src
    // Expected: finding sec-csp-unsafe-inline, severity warning
  });

  it('should detect mixed content', async () => {
    // Input: HTML HTTPS com <img src="http://...">
    // Expected: finding sec-mixed-content, severity critical
  });

  it('should detect server version leakage', async () => {
    // Input: headers com Server: Apache/2.4.51
    // Expected: finding sec-server-leaks-info, severity info
  });

  it('should flag HTTP (non-HTTPS) site', async () => {
    // Input: URL http://...
    // Expected: finding sec-no-https, severity critical
  });
});
```

#### Scoring Tests
```typescript
describe('Scoring', () => {
  it('should calculate correct grade for each score range', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(75)).toBe('C');
    expect(scoreToGrade(60)).toBe('D');
    expect(scoreToGrade(40)).toBe('F');
  });

  it('should calculate weighted overall score', () => {
    const results = [
      { analyzer: 'performance', score: 90 },  // peso 20
      { analyzer: 'seo', score: 70 },           // peso 25
      { analyzer: 'accessibility', score: 80 }, // peso 15
      { analyzer: 'content', score: 75 },       // peso 15
      { analyzer: 'branding', score: 60 },      // peso 10
      { analyzer: 'security', score: 50 },       // peso 15
    ];
    // Expected: 90*0.20 + 70*0.25 + 80*0.15 + 75*0.15 + 60*0.10 + 50*0.15
    //         = 18 + 17.5 + 12 + 11.25 + 6 + 7.5 = 72.25 → 72
    expect(calculateOverallScore(results)).toBe(72);
  });

  it('should sort findings by severity', () => {
    const findings = [
      { severity: 'info' },
      { severity: 'critical' },
      { severity: 'warning' },
      { severity: 'pass' },
    ];
    const sorted = sortBySeverity(findings);
    expect(sorted.map(f => f.severity)).toEqual(['critical', 'warning', 'info', 'pass']);
  });
});
```

#### HTML Parser Tests
```typescript
describe('HTMLParser', () => {
  it('should extract title tag', () => {
    const html = '<html><head><title>Test Page</title></head></html>';
    expect(extractTitle(html)).toBe('Test Page');
  });

  it('should extract meta description', () => {
    const html = '<meta name="description" content="Test description">';
    expect(extractMetaDescription(html)).toBe('Test description');
  });

  it('should extract all headings in order', () => {
    const html = '<h1>Main</h1><h2>Sub1</h2><h2>Sub2</h2><h3>Detail</h3>';
    expect(extractHeadings(html)).toEqual({
      h1: ['Main'], h2: ['Sub1', 'Sub2'], h3: ['Detail'],
      h4: [], h5: [], h6: [],
    });
  });

  it('should extract images with and without alt', () => {
    const html = '<img src="a.jpg" alt="Photo"><img src="b.jpg">';
    const images = extractImages(html);
    expect(images.total).toBe(2);
    expect(images.withAlt).toBe(1);
    expect(images.withoutAlt).toBe(1);
  });

  it('should extract internal and external links', () => {
    const html = '<a href="/about">About</a><a href="https://external.com">External</a>';
    const links = extractLinks(html, 'https://example.com');
    expect(links.internal).toBe(1);
    expect(links.external).toBe(1);
  });

  it('should extract JSON-LD structured data', () => {
    const html = '<script type="application/ld+json">{"@type":"Organization"}</script>';
    const data = extractStructuredData(html);
    expect(data[0].type).toBe('Organization');
  });

  it('should extract Open Graph tags', () => {
    const html = '<meta property="og:title" content="Test">';
    expect(extractOpenGraph(html)['og:title']).toBe('Test');
  });

  it('should handle malformed HTML gracefully', () => {
    const html = '<html><head><title>Unclosed';
    expect(() => extractTitle(html)).not.toThrow();
  });
});
```

## E2E Tests (Playwright)

### Estrutura

```
tests/
  e2e/
    home.spec.ts
    audit-flow.spec.ts
    report.spec.ts
    drill-down.spec.ts
    accessibility.spec.ts       ← testa a11y do PROPRIO WebScope
    history.spec.ts
    export.spec.ts
```

### Cenarios

```typescript
// home.spec.ts
test('home page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /webscope/i })).toBeVisible();
  await expect(page.getByPlaceholder(/url/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /analyze/i })).toBeVisible();
});

test('URL input validates format', async ({ page }) => {
  await page.goto('/');
  await page.fill('input', 'not-a-url');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/valid url/i)).toBeVisible();
});

// audit-flow.spec.ts
test('full audit flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('input', 'https://example.com');
  await page.click('button[type="submit"]');
  // Esperar loading
  await expect(page.getByText(/analyzing/i)).toBeVisible();
  // Esperar resultado (timeout longo — PSI demora)
  await expect(page.getByText(/overall score/i)).toBeVisible({ timeout: 60000 });
  // Verificar 6 score cards
  await expect(page.getByText(/performance/i)).toBeVisible();
  await expect(page.getByText(/seo/i)).toBeVisible();
  await expect(page.getByText(/accessibility/i)).toBeVisible();
  await expect(page.getByText(/content/i)).toBeVisible();
  await expect(page.getByText(/branding/i)).toBeVisible();
  await expect(page.getByText(/security/i)).toBeVisible();
});

// accessibility.spec.ts (testa o PROPRIO WebScope)
test('WebScope passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Mocks de teste

### lighthouse-good.json
Resposta real do PageSpeed Insights pra um site bem otimizado. Capturar uma vez e salvar como fixture. Scores: performance 95+, accessibility 95+, SEO 95+.

### lighthouse-bad.json
Resposta pra site com problemas. Scores: performance < 50, accessibility < 60, SEO < 50.

### html-good.html
HTML completo com:
- `<title>` de 50 caracteres
- `<meta name="description">` de 150 caracteres
- `<meta name="viewport">`
- 1 `<h1>`, 3 `<h2>`, hierarquia correta
- Todas `<img>` com `alt`
- `<link rel="canonical">`
- Open Graph completo
- JSON-LD Organization schema
- Links internos e externos
- CTAs visiveis
- Favicon
- Language attribute

### html-bad.html
HTML com problemas:
- Sem `<title>`
- Sem meta description
- 3 `<h1>`, hierarquia quebrada
- Imagens sem alt
- Links quebrados (href="#")
- Sem canonical
- Sem Open Graph
- Sem structured data
- Mixed content (src http://)

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

## Praticas de QA

### Code review checklist (pra cada PR)

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

### Definicao de "pronto" por fase

Uma fase so esta pronta quando:
1. Todos os testes passam (unit + E2E relevantes)
2. Build sem erros
3. Deployado em producao
4. Testado no browser (golden path + edge cases)
5. bugs-melhorias.md atualizado (se achados)
6. Commit message segue conventional commits
7. PR mergeado via squash merge

### Regression testing

Ao adicionar novo analyzer, verificar que:
1. Analyzers existentes continuam funcionando (testes passam)
2. Score geral ainda calcula corretamente com novo peso
3. Radar chart renderiza com nova categoria
4. Pagina de relatorio mostra novo score card
5. Export inclui dados do novo analyzer
