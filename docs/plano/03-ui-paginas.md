# WebScope — UI e Paginas

## Design System

Reutilizar do growth-dashboard com adaptacoes:

### Cores (CSS tokens)

```css
/* Dark mode (default) */
--bg-primary: #0a0a0f;
--bg-secondary: #111118;
--bg-card: #1a1a24;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--accent: #818cf8;           /* indigo — mesma do growth-dashboard */
--accent-hover: #6366f1;
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Grades */
--grade-a: #22c55e;          /* verde */
--grade-b: #84cc16;          /* verde-amarelo */
--grade-c: #f59e0b;          /* amarelo */
--grade-d: #f97316;          /* laranja */
--grade-f: #ef4444;          /* vermelho */

/* Light mode */
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--bg-card: #ffffff;
--text-primary: #0f172a;
--text-secondary: #64748b;
```

### Fontes

- **Headings:** Oswald (mesma do growth-dashboard e RapidCanvas)
- **Body:** Inter (mesma do growth-dashboard)
- **Monospace:** JetBrains Mono (pra codigo, URLs, valores tecnicos)

### Componentes reutilizaveis

| Componente | Descricao | Origem |
|---|---|---|
| `ScoreCard` | Card com score 0-100, grade, cor por faixa | Novo (inspirado no KPI card do growth-dashboard) |
| `GradeCircle` | Circulo com grade A-F e cor | Novo |
| `FindingCard` | Card expandivel com severity, titulo, descricao, recomendacao | Novo |
| `FindingList` | Lista de findings filtravelmente severity | Novo |
| `RadarChart` | ECharts radar com 6 categorias | Novo (ECharts do growth-dashboard) |
| `GaugeChart` | ECharts gauge pra score individual | Novo |
| `BarChart` | ECharts bar horizontal pra comparacoes | Reutilizar pattern |
| `Sidebar` | Navegacao lateral | Adaptar do growth-dashboard |
| `CommandPalette` | Ctrl+K fuzzy search | Reutilizar do growth-dashboard |
| `ThemeToggle` | Dark/light switch | Reutilizar do growth-dashboard |
| `SkeletonLoader` | Pulse animation | Reutilizar do growth-dashboard |
| `DataSourceTag` | Badge mostrando "API", "Parsed", "AI" | Adaptar do growth-dashboard |
| `ExportButton` | Download CSV/MD/PDF | Adaptar do growth-dashboard |
| `Tooltip` | Hover info (?) icons | Reutilizar do growth-dashboard |

---

## Paginas — detalhamento

### 1. Home / Scanner (`/`)

**Proposito:** entrada principal. Usuario digita URL e inicia auditoria.

**Layout:**
```
+--------------------------------------------------+
|  [Logo] WebScope           [Theme] [Login]       |
+--------------------------------------------------+
|                                                    |
|           WebScope                                 |
|    Analyze any website in seconds                  |
|                                                    |
|    +------------------------------------------+    |
|    | https://example.com            [Analyze] |    |
|    +------------------------------------------+    |
|                                                    |
|    Try with:  [growth.sal.dev.br]                  |
|               [salomaostudart.github.io/portfolio] |
|               [Your landing page]                  |
|                                                    |
|    ----------------------------------------        |
|                                                    |
|    How it works:                                   |
|    1. Enter URL  2. We analyze  3. Get report     |
|                                                    |
|    [Performance] [SEO] [Accessibility]             |
|    [Content] [Branding] [Security]                 |
|    6 categories, 100+ checks, AI suggestions       |
|                                                    |
+--------------------------------------------------+
```

**Comportamento:**
- Ao clicar "Analyze", mostra loading (skeleton) e depois redireciona pra `/report/[id]`
- Se usuario logado, mostra "Recent audits" abaixo
- Links de exemplo pra sites proprios (landing pages, portfolio, growth-dashboard)

### 2. Relatorio Geral (`/report/[id]`)

**Proposito:** overview da auditoria. Score geral + 6 categorias.

**Layout:**
```
+----------+------------------------------------------+
| Sidebar  |                                          |
|          |  [URL auditada]           [Export] [Share]|
|  Home    |  Analyzed: 13/04/2026 15:30              |
|  -----   |                                          |
|  Report  |  +---+  Overall Score: 74 / 100  [C]    |
|   Perf   |  |   |  "Your site needs improvements    |
|   SEO    |  | C |   in SEO and security."           |
|   A11y   |  |   |  — AI Summary                     |
|   Content|  +---+                                   |
|   Brand  |                                          |
|   Secur  |  [====== Radar Chart 6 categorias ======]|
|  -----   |                                          |
|  History |  +------+ +------+ +------+              |
|  About   |  | Perf | | SEO  | |A11y  |              |
|          |  |  85  | |  62  | | 78   |              |
|          |  |  [B] | |  [D] | | [C]  |              |
|          |  +------+ +------+ +------+              |
|          |  +------+ +------+ +------+              |
|          |  |Content| |Brand | |Secur |              |
|          |  |  71   | |  68  | | 55   |              |
|          |  |  [C]  | |  [D] | | [D]  |              |
|          |  +------+ +------+ +------+              |
|          |                                          |
|          |  === Quick Wins (AI) ===                  |
|          |  1. Add meta description (+8 SEO)        |
|          |  2. Enable HSTS (+5 Security)            |
|          |  3. Fix H1 hierarchy (+3 SEO)            |
|          |  4. Add alt text to 5 images (+4 A11y)   |
|          |  5. Optimize hero image (+3 Perf)        |
|          |                                          |
|          |  === Critical Findings (3) ===            |
|          |  [Finding Card expandivel]               |
|          |  [Finding Card expandivel]               |
|          |  [Finding Card expandivel]               |
|          |                                          |
|          |  === Warnings (12) ===                    |
|          |  [Finding Card expandivel]               |
|          |  ...                                     |
|          |                                          |
+----------+------------------------------------------+
```

**Componentes:**
- Score geral grande com GradeCircle
- Radar chart ECharts com os 6 scores
- 6 ScoreCards clicaveis (navega pro drill-down)
- Quick Wins (top 5 sugestoes da IA, com impacto estimado)
- Findings agrupados por severity (critical, warning, info, pass)
- AI Summary (1 paragrafo gerado pelo Claude Haiku)
- Export buttons (CSV, MD, PDF)

### 3. Drill-down por categoria (`/report/[id]/<categoria>`)

**Proposito:** detalhes de um analyzer especifico.

**Layout comum a todos:**
```
+----------+------------------------------------------+
| Sidebar  |                                          |
|          |  [Categoria]  Score: 62 [D]              |
|          |  [URL auditada]                          |
|          |                                          |
|          |  [Gauge Chart grande]                    |
|          |                                          |
|          |  === Sub-scores ===                       |
|          |  (tabela ou cards especificos)            |
|          |                                          |
|          |  === Findings ===                         |
|          |  [Critical] [Warning] [Info] [Pass]      |
|          |  (tabs filtraveis)                       |
|          |                                          |
|          |  [Finding Card com detalhes]              |
|          |  [Finding Card com detalhes]              |
|          |  ...                                     |
|          |                                          |
|          |  === Recommendations ===                  |
|          |  (lista de recomendacoes priorizadas)     |
|          |                                          |
+----------+------------------------------------------+
```

**Conteudo especifico por pagina:**

| Pagina | Sub-scores | Charts |
|---|---|---|
| Performance | CWV (LCP, INP, CLS), FCP, SI, TTI, TBT | Gauge por CWV, waterfall de peso |
| SEO | Meta tags, Headings, Links, Images, Structured Data | Bar chart de cobertura |
| Accessibility | WCAG violations by impact, landmarks, contrast | Donut de pass/fail |
| Content | Readability, Links, Images, CTAs | Word count, link status |
| Branding | Colors, Fonts, Logo, Manifest | Paleta de cores visual, font preview |
| Security | HTTPS, Headers, Mixed Content, Cookies | Checklist visual |

### 4. Historico (`/history`)

**Proposito:** auditorias anteriores. Requer login.

**Layout:**
```
+----------+------------------------------------------+
| Sidebar  |                                          |
|          |  Audit History                            |
|          |                                          |
|          |  [Filtro: dominio] [Filtro: periodo]      |
|          |                                          |
|          |  +------+------+-------+------+-------+  |
|          |  | Date | URL  | Score | Grade| Action|  |
|          |  +------+------+-------+------+-------+  |
|          |  | 13/04| ex.. |   74  |  C   | [View]|  |
|          |  | 12/04| ex.. |   68  |  D   | [View]|  |
|          |  | 10/04| ex.. |   71  |  C   | [View]|  |
|          |  +------+------+-------+------+-------+  |
|          |                                          |
|          |  === Trend Chart ===                      |
|          |  (score ao longo do tempo pra mesmo URL)  |
|          |                                          |
+----------+------------------------------------------+
```

### 5. About (`/about`)

**Proposito:** explicar o que e, como funciona, stack, metodologia.

**Conteudo:**
- O que o WebScope faz
- Como funciona (fluxo tecnico simplificado)
- 6 categorias de analise explicadas
- Stack tecnica
- Metodologia de scoring
- Limitacoes (nao substitui auditoria manual, analisa 1 pagina por vez na v1)
- Como adicionar novos analyzers
- Creditos e links

### 6. Login (`/login`)

**Proposito:** autenticacao pra features que requerem persistencia.

**Funcionalidades que requerem login:**
- Historico de auditorias
- Comparacao temporal
- AI branding analysis (mais detalhado)
- Export PDF branded

**Funcionalidades SEM login:**
- Auditoria completa (6 analyzers)
- Relatorio visual
- Export CSV/MD
- Quick wins

**Auth:** Supabase magic link (mesmo setup do growth-dashboard)
