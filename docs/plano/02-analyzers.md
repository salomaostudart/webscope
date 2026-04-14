# WebScope — Analyzers (detalhamento completo)

Cada analyzer e um modulo independente que recebe o mesmo input (URL + HTML + headers + Lighthouse) e retorna um score 0-100 com findings priorizados.

---

## 1. Performance Analyzer

**Peso no score geral:** 20%
**Fonte principal:** PageSpeed Insights API (Lighthouse)
**Pasta:** `src/analyzers/performance/`

### Metricas avaliadas

| Metrica | Fonte | Threshold bom | Threshold ruim |
|---|---|---|---|
| Largest Contentful Paint (LCP) | Lighthouse | < 2.5s | > 4.0s |
| Interaction to Next Paint (INP) | Lighthouse | < 200ms | > 500ms |
| Cumulative Layout Shift (CLS) | Lighthouse | < 0.1 | > 0.25 |
| First Contentful Paint (FCP) | Lighthouse | < 1.8s | > 3.0s |
| Speed Index | Lighthouse | < 3.4s | > 5.8s |
| Time to Interactive (TTI) | Lighthouse | < 3.8s | > 7.3s |
| Total Blocking Time (TBT) | Lighthouse | < 200ms | > 600ms |
| Total page size | HTML parsing | < 3MB | > 5MB |
| Number of requests | Lighthouse | < 50 | > 100 |
| Image optimization | Lighthouse | WebP/AVIF | Unoptimized PNG/JPG |

### Findings gerados

| ID | Severity | Titulo | Condicao |
|---|---|---|---|
| `perf-lcp-slow` | critical | LCP acima de 4 segundos | LCP > 4.0s |
| `perf-lcp-needs-work` | warning | LCP entre 2.5 e 4 segundos | 2.5s < LCP < 4.0s |
| `perf-lcp-good` | pass | LCP dentro do recomendado | LCP < 2.5s |
| `perf-cls-high` | critical | Layout shift excessivo | CLS > 0.25 |
| `perf-cls-moderate` | warning | Layout shift moderado | 0.1 < CLS < 0.25 |
| `perf-inp-slow` | critical | Interatividade lenta | INP > 500ms |
| `perf-fcp-slow` | warning | Primeiro conteudo demora | FCP > 3.0s |
| `perf-page-size-large` | warning | Pagina muito pesada | > 3MB |
| `perf-too-many-requests` | warning | Muitas requisicoes HTTP | > 50 requests |
| `perf-unoptimized-images` | warning | Imagens nao otimizadas | PNG/JPG > 100KB sem WebP |
| `perf-render-blocking` | warning | Recursos bloqueando render | CSS/JS blocking detectado |
| `perf-no-compression` | warning | Sem compressao gzip/brotli | Content-Encoding ausente |

### Dados retornados (tipo `PerformanceData`)

```typescript
interface PerformanceData {
  scores: {
    performance: number;         // 0-100 do Lighthouse
    lcp: { value: number; unit: 'ms' | 's'; rating: 'good' | 'needs-improvement' | 'poor' };
    inp: { value: number; unit: 'ms'; rating: string };
    cls: { value: number; rating: string };
    fcp: { value: number; unit: 's'; rating: string };
    si: { value: number; unit: 's'; rating: string };
    tti: { value: number; unit: 's'; rating: string };
    tbt: { value: number; unit: 'ms'; rating: string };
  };
  pageWeight: {
    total: number;               // bytes
    html: number;
    css: number;
    js: number;
    images: number;
    fonts: number;
    other: number;
  };
  requestCount: number;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings: string;             // ex: "Potential savings of 2.1 s"
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    details?: string;
  }>;
}
```

---

## 2. SEO Analyzer

**Peso no score geral:** 25%
**Fonte principal:** HTML parsing + PageSpeed Insights
**Pasta:** `src/analyzers/seo/`

### Checks realizados

#### Meta Tags
| Check | Criterio | Severity se falhar |
|---|---|---|
| Title tag presente | `<title>` existe e nao vazio | critical |
| Title tag comprimento | 30-60 caracteres | warning |
| Title tag unico | Nao duplicado em outras paginas (se multi-URL) | warning |
| Meta description presente | `<meta name="description">` existe | critical |
| Meta description comprimento | 120-160 caracteres | warning |
| Meta viewport | `<meta name="viewport">` com width=device-width | warning |
| Meta charset | `<meta charset="utf-8">` ou equivalente | info |
| Meta robots | Se presente, nao bloqueia indexacao sem motivo | warning |

#### Headings
| Check | Criterio | Severity se falhar |
|---|---|---|
| H1 presente | Exatamente 1 `<h1>` na pagina | critical |
| H1 unico | Nao mais que 1 `<h1>` | warning |
| Hierarquia correta | H2 depois de H1, H3 depois de H2, sem pular niveis | warning |
| Headings nao vazios | Nenhum heading com texto vazio | warning |

#### Links
| Check | Criterio | Severity se falhar |
|---|---|---|
| Links internos presentes | Pelo menos 1 link interno | warning |
| Links com texto descritivo | Nao usar "clique aqui", "saiba mais" generico | info |
| Links externos com rel | `rel="noopener"` em links `target="_blank"` | info |
| Links quebrados | HTTP 404/500 em links internos | critical |

#### Imagens
| Check | Criterio | Severity se falhar |
|---|---|---|
| Alt text presente | Todas as `<img>` com `alt` | critical |
| Alt text descritivo | Alt nao e nome do arquivo ou generico | warning |
| Lazy loading | Imagens abaixo do fold com `loading="lazy"` | info |
| Dimensoes explicitas | `width` e `height` definidos (evita CLS) | warning |
| Formato otimizado | Uso de WebP/AVIF em vez de PNG/JPG | info |

#### Structured Data
| Check | Criterio | Severity se falhar |
|---|---|---|
| JSON-LD presente | Pelo menos 1 bloco `<script type="application/ld+json">` | info |
| Schema valido | JSON parseavel e com @type definido | warning |
| Organization schema | Schema da organizacao presente (homepage) | info |
| FAQ schema | Presenca de FAQPage schema (se tem FAQ) | info |
| Breadcrumb schema | BreadcrumbList schema (se tem breadcrumbs) | info |

#### Crawlability
| Check | Criterio | Severity se falhar |
|---|---|---|
| robots.txt acessivel | GET /robots.txt retorna 200 | warning |
| robots.txt nao bloqueia | Nao bloqueia / pra Googlebot | critical |
| sitemap.xml presente | GET /sitemap.xml retorna 200 | warning |
| Canonical URL | `<link rel="canonical">` presente | warning |
| Canonical valida | Canonical aponta pra URL correta | warning |

#### Open Graph / Social
| Check | Criterio | Severity se falhar |
|---|---|---|
| og:title | Presente | warning |
| og:description | Presente | warning |
| og:image | Presente e URL valida | warning |
| og:url | Presente | info |
| og:type | Presente | info |
| twitter:card | Presente | info |
| twitter:title | Presente | info |
| twitter:image | Presente | info |

#### URL Structure
| Check | Criterio | Severity se falhar |
|---|---|---|
| URL limpa | Sem parametros desnecessarios, slugs legiveis | info |
| HTTPS | URL usa https:// | critical |
| Trailing slash consistente | Todas as URLs com ou sem slash (nao misto) | info |
| Hreflang | Se multi-idioma, hreflang configurado | info |

### Dados retornados (tipo `SEOData`)

```typescript
interface SEOData {
  title: { value: string | null; length: number; isOptimal: boolean };
  metaDescription: { value: string | null; length: number; isOptimal: boolean };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
    hierarchyValid: boolean;
  };
  links: {
    internal: number;
    external: number;
    broken: string[];      // URLs que retornaram 404/5xx
    noText: string[];      // links sem texto descritivo
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: string[];  // src das imagens sem alt
    unoptimized: string[]; // src de imagens grandes sem WebP
  };
  structuredData: Array<{
    type: string;          // ex: "Organization", "FAQPage"
    valid: boolean;
    raw: object;
  }>;
  openGraph: Record<string, string | null>;
  twitterCard: Record<string, string | null>;
  canonical: string | null;
  robotsTxt: { exists: boolean; blocks: boolean; content: string | null };
  sitemapXml: { exists: boolean; url: string | null };
  lighthouseSeoScore: number;
}
```

---

## 3. Accessibility Analyzer

**Peso no score geral:** 15%
**Fonte principal:** PageSpeed Insights (axe-core via Lighthouse) + HTML parsing
**Pasta:** `src/analyzers/accessibility/`

### Checks realizados

| Check | Criterio | Severity se falhar |
|---|---|---|
| WCAG 2.1 AA score | Score do Lighthouse accessibility | Varia |
| Language attribute | `<html lang="...">` presente | critical |
| Alt text em imagens | Todas as `<img>` com `alt` | critical |
| Color contrast | Ratio minimo 4.5:1 texto normal, 3:1 texto grande | critical |
| Form labels | Todo `<input>` com `<label>` associado | critical |
| ARIA landmarks | Presenca de `<main>`, `<nav>`, `<header>`, `<footer>` | warning |
| ARIA roles validos | Roles usados corretamente | warning |
| Focus indicators | Elementos focaveis tem estilo :focus visivel | warning |
| Skip navigation | Link "skip to content" no topo | info |
| Keyboard navigation | Tab order logico, sem trap | warning |
| Heading order | H1-H6 em sequencia correta | warning |
| Link purpose | Links com texto descritivo (nao "click here") | warning |
| Table headers | Tabelas com `<th>` ou `scope` | warning |
| Autoplay | Sem video/audio com autoplay sem controles | warning |
| Font size minimo | Texto >= 16px no body | info |
| Touch targets | Elementos clicaveis >= 44x44px em mobile | info |

### Dados retornados (tipo `AccessibilityData`)

```typescript
interface AccessibilityData {
  lighthouseScore: number;
  violations: Array<{
    id: string;            // ex: "color-contrast"
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    helpUrl: string;       // link pra documentacao axe-core
    nodes: number;         // quantos elementos afetados
  }>;
  passes: number;          // quantos checks passaram
  incomplete: number;      // checks que precisam revisao manual
  languageSet: boolean;
  landmarksPresent: string[];  // ['main', 'nav', 'header', 'footer']
  landmarksMissing: string[];
  contrastIssues: number;
  formsWithoutLabels: number;
  imagesWithoutAlt: number;
}
```

---

## 4. Content Analyzer

**Peso no score geral:** 15%
**Fonte principal:** HTML parsing + heuristicas
**Pasta:** `src/analyzers/content/`

### Checks realizados

| Check | Criterio | Severity se falhar |
|---|---|---|
| Word count | Pagina principal com pelo menos 300 palavras | warning |
| Readability | Score Flesch-Kincaid adequado pro publico | info |
| Broken links internos | Links internos que retornam 404 | critical |
| Broken links externos | Links externos que retornam 404 | warning |
| Imagens sem alt | Cobertura de alt text | critical |
| Imagens com alt generico | "image", "photo", "img_001" | warning |
| CTA presente | Pelo menos 1 call-to-action na pagina | warning |
| CTA visivel | CTA acima do fold (estimativa) | info |
| FAQ presente | Secao de FAQ ou pagina de FAQ linkada | info |
| Contact info | Email, telefone ou formulario de contato | info |
| Social links | Links pra redes sociais | info |
| 404 page custom | /404 retorna pagina personalizada (nao default) | info |
| Favicon | Favicon presente | warning |
| Conteudo duplicado | Title ou meta description iguais entre paginas | warning |
| Texto em imagens | Deteccao de texto excessivo em imagens (heuristica) | info |
| Empty state | Paginas com pouco/nenhum conteudo | warning |

### Dados retornados (tipo `ContentData`)

```typescript
interface ContentData {
  wordCount: number;
  readabilityScore: number;          // 0-100 Flesch-Kincaid adaptado
  readabilityLevel: string;          // "easy", "moderate", "difficult"
  brokenLinks: {
    internal: Array<{ url: string; statusCode: number; foundOn: string }>;
    external: Array<{ url: string; statusCode: number; foundOn: string }>;
  };
  images: {
    total: number;
    withAlt: number;
    withGenericAlt: number;
    withoutAlt: number;
  };
  ctas: Array<{
    text: string;
    href: string;
    position: 'above-fold' | 'below-fold';
  }>;
  hasFAQ: boolean;
  hasContactInfo: boolean;
  hasSocialLinks: boolean;
  has404Page: boolean;
  hasFavicon: boolean;
}
```

---

## 5. Branding Analyzer

**Peso no score geral:** 10%
**Fonte principal:** HTML parsing + CSS extraction + AI (Claude Haiku)
**Pasta:** `src/analyzers/branding/`

### Checks realizados

| Check | Criterio | Severity se falhar |
|---|---|---|
| Logo presente | `<img>` com "logo" no src, alt ou class | warning |
| Favicon presente | `<link rel="icon">` ou `/favicon.ico` | warning |
| Apple touch icon | `<link rel="apple-touch-icon">` | info |
| OG image | `<meta property="og:image">` | warning |
| Color palette | Quantidade razoavel de cores (< 8 cores primarias) | info |
| Font families | Quantidade razoavel de fontes (< 4 familias) | info |
| Font loading | Fontes carregadas de forma otimizada (preload/display:swap) | info |
| Brand consistency | Cores e fontes consistentes entre header/body/footer | info |
| PWA manifest | `manifest.json` com name, icons, theme_color | info |
| Theme color | `<meta name="theme-color">` presente | info |

### Extracao de dados visuais

O analyzer extrai informacoes visuais do HTML e CSS inline:
- **Cores:** `background-color`, `color`, `border-color` de elementos principais (body, header, nav, footer, buttons, links)
- **Fontes:** `font-family` usados no CSS (inline styles, `<style>` blocks, Google Fonts links)
- **Logo:** procura por `<img>` com atributos contendo "logo", ou `<svg>` no header

### AI Branding Analysis (opcional — via Edge Function)

Se o usuario estiver logado, o analyzer envia o HTML resumido pro Claude Haiku pra:
- Avaliar tom de voz do conteudo (formal, informal, tecnico, amigavel)
- Sugerir melhorias de copy
- Avaliar consistencia da mensagem
- Identificar falta de CTAs ou proposta de valor

### Dados retornados (tipo `BrandingData`)

```typescript
interface BrandingData {
  colors: {
    palette: Array<{ hex: string; usage: string; count: number }>;
    totalUnique: number;
    isConsistent: boolean;       // < 8 cores primarias
  };
  fonts: {
    families: Array<{ name: string; weights: string[]; source: 'system' | 'google' | 'custom' }>;
    totalFamilies: number;
    hasDisplaySwap: boolean;     // font-display: swap
    hasPreload: boolean;
  };
  logo: {
    found: boolean;
    src: string | null;
    inHeader: boolean;
  };
  favicon: {
    found: boolean;
    type: string | null;         // "svg", "ico", "png"
  };
  manifest: {
    found: boolean;
    hasName: boolean;
    hasIcons: boolean;
    hasThemeColor: boolean;
  };
  aiAnalysis?: {                 // opcional, requer login
    toneOfVoice: string;
    suggestions: string[];
    overallImpression: string;
  };
}
```

---

## 6. Security Analyzer

**Peso no score geral:** 15%
**Fonte principal:** Response headers + HTML parsing
**Pasta:** `src/analyzers/security/`

### Checks realizados

| Check | Criterio | Severity se falhar |
|---|---|---|
| HTTPS | URL usa https:// | critical |
| HTTP redirect | http:// redireciona pra https:// | critical |
| HSTS | `Strict-Transport-Security` presente | critical |
| HSTS max-age | max-age >= 31536000 (1 ano) | warning |
| HSTS includeSubDomains | Inclui subdomains | info |
| HSTS preload | Inclui preload | info |
| CSP | `Content-Security-Policy` presente | warning |
| CSP unsafe-inline | Nao usa `unsafe-inline` em script-src | warning |
| CSP unsafe-eval | Nao usa `unsafe-eval` | warning |
| X-Frame-Options | Presente (DENY ou SAMEORIGIN) | warning |
| X-Content-Type-Options | `nosniff` presente | warning |
| Referrer-Policy | Presente | warning |
| Permissions-Policy | Presente | info |
| Server header | Ausente ou generico (nao revelar versao) | info |
| X-Powered-By | Ausente (nao revelar stack) | info |
| Mixed content | Sem recursos HTTP em pagina HTTPS | critical |
| SRI | Scripts externos com `integrity` attribute | info |
| Cookie flags | HttpOnly, Secure, SameSite em cookies visiveis | warning |
| Form action HTTPS | Forms enviando pra HTTPS | critical |
| CORS permissivo | `Access-Control-Allow-Origin: *` sem necessidade | info |

### Dados retornados (tipo `SecurityData`)

```typescript
interface SecurityData {
  https: boolean;
  httpRedirects: boolean;
  headers: {
    hsts: { present: boolean; maxAge: number | null; includeSubDomains: boolean; preload: boolean };
    csp: { present: boolean; value: string | null; hasUnsafeInline: boolean; hasUnsafeEval: boolean };
    xFrameOptions: { present: boolean; value: string | null };
    xContentTypeOptions: { present: boolean };
    referrerPolicy: { present: boolean; value: string | null };
    permissionsPolicy: { present: boolean; value: string | null };
    server: { present: boolean; value: string | null; leaksInfo: boolean };
    xPoweredBy: { present: boolean; value: string | null };
  };
  mixedContent: {
    found: boolean;
    resources: string[];        // URLs HTTP em pagina HTTPS
  };
  sri: {
    externalScripts: number;
    withIntegrity: number;
    without: string[];          // src de scripts sem SRI
  };
  cookies: Array<{
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string | null;
  }>;
  forms: {
    total: number;
    insecureAction: string[];   // forms com action HTTP
  };
}
```

---

## Como adicionar um novo analyzer (futuro)

1. Criar pasta em `src/analyzers/<nome>/`
2. Implementar `IAnalyzer<T>` (interface em `src/analyzers/base/analyzer.interface.ts`)
3. Definir schema Zod dos dados em `src/analyzers/base/analyzer.schema.ts`
4. Registrar no `src/analyzers/registry.ts`
5. Adicionar peso no score geral (ajustar pesos existentes pra somar 100)
6. Criar pagina em `src/pages/report/[id]/<nome>.astro`
7. Adicionar testes unitarios em `tests/unit/analyzers/<nome>.test.ts`

Tempo estimado: ~2 horas para um analyzer basico com UI.
