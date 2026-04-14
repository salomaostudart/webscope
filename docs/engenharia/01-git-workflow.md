# Git Workflow — WebScope

Baseado em: GitHub Flow, Conventional Commits, boas praticas de `hq/SALDEV/boas-praticas/git-github.md`.

---

## Modelo: GitHub Flow

Branch unica de producao (`main`) + feature branches de curta duracao.
Toda mudanca via Pull Request. **Main = deploy automatico.**

```
main ─────●─────●─────●─────●─────●─────── (sempre deployavel)
           \   /       \   /       \   /
  feature/  ●-●    fix/ ●   feat/  ●-●-●
  analyzers       hsts       ai-suggestions
```

**Regra fundamental:** main e a branch de producao. Tudo que entra na main vai para deploy. Nao existe branch de staging, develop, ou release.

---

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

### Regras obrigatorias

1. **Nunca commitar direto na main.** Toda mudanca via feature branch + PR.
2. **Branches de curta duracao.** Cada branch representa 1 fase ou sub-tarefa. Nao acumular semanas de trabalho.
3. **Delete branch on merge.** Configurado no GitHub: Settings > General > Automatically delete head branches.
4. **Uma branch por fase.** Cada fase do plano (ver `docs/plano/05-fases.md`) gera uma ou mais branches.

### Mapeamento fases → branches

| Fase | Branch(es) |
|---|---|
| Fase 1: Setup + Perf + SEO | `feature/project-setup`, `feature/performance-analyzer`, `feature/seo-analyzer` |
| Fase 2: A11y + Content + Security | `feature/accessibility-analyzer`, `feature/content-analyzer`, `feature/security-analyzer` |
| Fase 3: Branding + AI | `feature/branding-analyzer`, `feature/ai-suggestions` |
| Fase 4: Auth + Historico | `feature/auth`, `feature/history`, `feature/polish` |
| Fase 5: MCP + Multi-URL + Automacao | `feature/mcp-server`, `feature/multi-url`, `feature/scheduling` |
| Fase 6: Webflow + Integracoes | `feature/webflow-aware`, `feature/growth-dashboard-link` |
| Fase 7: Auditoria + Abertura | `chore/audit`, `chore/public-release` |

### Fluxo de trabalho para cada branch

```
1. git checkout main && git pull
2. git checkout -b feature/nome-da-feature
3. Implementar + commitar (commits atomicos)
4. npm run ci (type-check + test + build)
5. git push -u origin feature/nome-da-feature
6. gh pr create --title "..." --body "..."
7. Revisar PR (self-review se solo)
8. Squash merge para main
9. Branch deletada automaticamente
10. Deploy automatico (main = producao)
```

---

## Commits

### Conventional Commits (obrigatorio)

```
<tipo>(<escopo>): <descricao>

[corpo opcional]

[footer opcional]
```

### Tipos

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat:` | Nova funcionalidade | `feat(seo): adicionar verificacao de structured data JSON-LD` |
| `fix:` | Correcao de bug | `fix(perf): corrigir calculo de LCP quando Lighthouse retorna null` |
| `docs:` | Documentacao | `docs: atualizar README com instrucoes de deploy` |
| `test:` | Testes | `test(security): adicionar testes pra HSTS validation` |
| `chore:` | Manutencao | `chore: atualizar Astro para 6.2.0` |
| `refactor:` | Reestruturacao | `refactor(analyzers): extrair scoring logic pra utils/scoring.ts` |
| `style:` | Formatacao | `style: aplicar prettier em src/` |
| `perf:` | Performance | `perf(ui): lazy load ECharts` |

### Escopos (opcionais)

`(perf)` `(seo)` `(a11y)` `(content)` `(branding)` `(security)` `(ui)` `(worker)` `(mcp)` `(auth)` `(ci)`

### Regras de commits

1. **Atomicos.** Cada commit = 1 mudanca logica. Nao misturar feature + fix + refactor.
2. **Descritivos.** A mensagem explica O QUE mudou. O corpo (se necessario) explica POR QUE.
3. **Nunca commitar secrets.** `.env`, chaves, service accounts = nunca no repo.
4. **Rodar testes antes.** `npm run test` deve passar antes de commitar.
5. **Nao commitar codigo comentado.** Se nao e necessario, deletar. Git tem historico.

---

## Pull Requests

### Template obrigatorio

Todo PR deve ter:

```markdown
## Summary
- O que mudou (2-3 bullet points)
- Por que mudou

## Test plan
- [ ] Testes unitarios passando (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Type check (`npm run type-check`)
- [ ] Testado no browser (se UI)
- [ ] Acessibilidade verificada (se UI)

## Screenshots (se UI)
(antes/depois se relevante)
```

### Merge strategy: Squash merge

Ao mergear PR, todos os commits da branch viram 1 commit na main.

**Motivo:**
- Main fica limpa (1 commit = 1 feature/fix completa)
- Commits intermediarios ("wip", "fix typo") nao poluem historico
- Cada commit na main e deployavel

### Self-review checklist

Antes de mergear, verificar:

- [ ] Codigo esta completo (nao ha TODOs pendentes neste PR)
- [ ] Testes cobrem o codigo novo
- [ ] Nenhum `console.log` em codigo de producao
- [ ] Nenhum `any` desnecessario em TypeScript
- [ ] Nenhum secret hardcoded
- [ ] Dados externos escapados (sem innerHTML)
- [ ] Componentes acessiveis (labels, alt, contrast)
- [ ] Responsivo testado em mobile (se UI)

---

## Configuracao do repositorio

### Settings obrigatorias

- [x] Private (inicialmente, publico na Fase 7)
- [x] Description preenchida
- [x] Topics adicionados (typescript, astro, seo, accessibility, web-audit, lighthouse)
- [x] Delete branch on merge: ON
- [x] Allow squash merging: ON (default)
- [ ] Branch protection na main: ativar quando Actions desbloqueado
- [ ] Require status checks: ativar quando CI configurado

### Branch protection (quando Actions desbloqueado)

```
GitHub repo → Settings → Branches → Add rule
- Branch name pattern: main
- Require a pull request before merging: ON
- Require status checks to pass: ON → selecionar CI
- Include administrators: ON
```

---

## Git no dia a dia

### Antes de comecar a trabalhar

```bash
git -C ~/Desktop/Projetos/webscope checkout main
git -C ~/Desktop/Projetos/webscope pull origin main
git -C ~/Desktop/Projetos/webscope checkout -b feature/nome-da-feature
```

### Antes de commitar

```bash
cd ~/Desktop/Projetos/webscope
npm run test          # testes unitarios
npm run type-check    # TypeScript
npm run lint          # ESLint
```

### Antes de criar PR

```bash
npm run ci            # type-check + test + build (pipeline completo)
```

### Enquanto Actions bloqueado

Rodar manualmente antes de mergear:
```bash
npm run ci    # type-check + test + build
```

Documentar no README que o CI esta planejado e os workflows ja existem em `.github/workflows/`.

---

## .gitignore

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
Thumbs.db

# IDE
.idea/
.vscode/

# worker
worker/node_modules/
worker/dist/
worker/.wrangler/
```

### O que NUNCA entra no repo

- `.env` (valores reais de env vars)
- Service account keys (`.json` de credenciais)
- Resultado de auditorias com dados sensiveis
- Screenshots com informacoes pessoais
- `node_modules/` (resolvido por npm install)

### O que SEMPRE entra no repo

- `.env.example` (template sem valores)
- `.gitignore`
- Arquivos de configuracao (tsconfig, eslint, prettier, vitest, playwright)
- Documentacao (README, CLAUDE.md, docs/)
- Workflows do GitHub Actions (`.github/workflows/`)
