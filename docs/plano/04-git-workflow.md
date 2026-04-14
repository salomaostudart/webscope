# WebScope — Git Workflow

## Modelo: GitHub Flow

Branch unica de producao (`main`) + feature branches de curta duracao.
Toda mudanca via Pull Request. Main = deploy automatico.

```
main ─────●─────●─────●─────●─────●─────── (sempre deployavel)
           \   /       \   /       \   /
  feature/  ●-●    fix/ ●   feat/  ●-●-●
  analyzers       hsts       ai-suggestions
```

## Branches

### Nomenclatura

```
<tipo>/<descricao-curta>
```

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feature/` | Nova funcionalidade | `feature/seo-analyzer` |
| `fix/` | Correcao de bug | `fix/contrast-calculation` |
| `docs/` | Documentacao | `docs/readme` |
| `refactor/` | Reestruturacao sem mudar comportamento | `refactor/analyzer-interface` |
| `test/` | Adicionar/corrigir testes | `test/e2e-report-page` |
| `chore/` | Manutencao (deps, configs) | `chore/update-astro` |

### Regras

1. **Nunca commitar direto na main.** Toda mudanca via feature branch + PR.
2. **Branches de curta duracao.** Cada branch representa 1 fase ou sub-tarefa. Nao acumular semanas de trabalho.
3. **Delete branch on merge.** Configurar no GitHub: Settings > General > Pull Requests > Automatically delete head branches.
4. **Uma branch por fase.** Cada fase do plano (ver `05-fases.md`) gera uma ou mais branches.

### Mapeamento fases → branches

| Fase | Branch(es) |
|---|---|
| Fase 1: Setup + Perf + SEO | `feature/project-setup`, `feature/performance-analyzer`, `feature/seo-analyzer` |
| Fase 2: A11y + Content + Security | `feature/accessibility-analyzer`, `feature/content-analyzer`, `feature/security-analyzer` |
| Fase 3: Branding + AI | `feature/branding-analyzer`, `feature/ai-suggestions` |
| Fase 4: Auth + Historico | `feature/auth`, `feature/history`, `feature/polish` |
| Fase 5: MCP + Automacao | `feature/mcp-server`, `feature/multi-url`, `feature/scheduling` |
| Fase 6: Webflow + Integracoes | `feature/webflow-aware`, `feature/growth-dashboard-link` |

## Commits

### Conventional Commits (obrigatorio)

```
<tipo>(<escopo>): <descricao>

[corpo opcional]

[footer opcional]
```

**Tipos:**
- `feat:` — nova funcionalidade
- `fix:` — correcao de bug
- `docs:` — documentacao
- `test:` — testes
- `chore:` — manutencao (deps, configs, CI)
- `refactor:` — reestruturacao sem mudar comportamento
- `style:` — formatacao (nao afeta logica)
- `perf:` — melhoria de performance

**Escopos (opcionais):**
- `(perf)` — performance analyzer
- `(seo)` — SEO analyzer
- `(a11y)` — accessibility analyzer
- `(content)` — content analyzer
- `(branding)` — branding analyzer
- `(security)` — security analyzer
- `(ui)` — componentes visuais
- `(worker)` — Cloudflare Worker
- `(mcp)` — MCP server
- `(auth)` — autenticacao
- `(ci)` — CI/CD

**Exemplos:**
```
feat(seo): adicionar verificacao de structured data JSON-LD
fix(perf): corrigir calculo de LCP quando Lighthouse retorna null
test(security): adicionar testes pra HSTS validation
docs: atualizar README com instrucoes de deploy
chore: atualizar Astro para 5.2.0
refactor(analyzers): extrair scoring logic pra utils/scoring.ts
```

### Regras de commits

1. **Atomicos.** Cada commit = 1 mudanca logica. Nao misturar feature + fix + refactor.
2. **Descritivos.** A mensagem explica O QUE mudou. O corpo (se necessario) explica POR QUE.
3. **Nunca commitar secrets.** `.env`, chaves, service accounts = nunca no repo.
4. **Rodar testes antes.** `npm run test` deve passar antes de commitar.
5. **Nao commitar codigo comentado.** Se nao e necessario, deletar. Git tem historico.

## Pull Requests

### Template

Todo PR deve ter:

```markdown
## Summary
- O que mudou (2-3 bullet points)
- Por que mudou

## Test plan
- [ ] Testes unitarios passando
- [ ] Build sem erros
- [ ] Testado no browser (se UI)
- [ ] Acessibilidade verificada (se UI)

## Screenshots (se UI)
(antes/depois se relevante)
```

### Merge strategy: Squash merge

Ao mergear PR, todos os commits da branch viram 1 commit na main. Motivo:
- Main fica limpa (1 commit = 1 feature/fix completa)
- Commits intermediarios ("wip", "fix typo") nao poluem historico

**Configurar no GitHub:** Settings > General > Pull Requests > Allow squash merging (default)

## Configuracao do repositorio

### Ao criar o repo

```bash
# Criar repo privado
gh repo create salomaostudart/webscope --private --description "Website intelligence platform — analyze any URL for performance, SEO, accessibility, content, branding, and security"

# Configurar
gh repo edit salomaostudart/webscope --add-topic "typescript,astro,seo,accessibility,web-audit,lighthouse"

# Branch protection (quando Actions estiver funcionando)
# gh api repos/salomaostudart/webscope/branches/main/protection -X PUT -f ...
```

### Settings do repo

- [x] Private (inicialmente)
- [x] Description preenchida
- [x] Topics adicionados
- [x] Delete branch on merge: ON
- [x] Allow squash merging: ON (default)
- [ ] Branch protection na main: ativar quando Actions desbloqueado
- [ ] Require status checks: ativar quando CI configurado

### .gitignore (base)

```gitignore
# build
dist/
.astro/

# dependencies
node_modules/

# env
.env
.env.local
.env.production

# test results
test-results/
playwright-report/

# credentials
**/service-account*.json

# OS
.DS_Store

# IDE
.idea/

# worker
worker/node_modules/
worker/dist/
```

## GitHub Actions (quando desbloqueado)

### CI Pipeline (`ci.yml`)

Roda em todo push e PR:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

### Deploy Pipeline (`deploy.yml`)

Roda apenas em push na main:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: ci  # depende do CI passar
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name webscope --branch main
```

### Enquanto Actions bloqueado

Rodar manualmente antes de mergear:
```bash
npm run ci    # type-check + test + build
npm run deploy  # ci + deploy CF Pages
```

Documentar no README que o CI esta planejado e o workflow ja existe em `.github/workflows/`.
