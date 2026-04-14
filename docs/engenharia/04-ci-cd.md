# CI/CD — WebScope

GitHub Actions esta bloqueado no momento. Os workflows ja estao criados e serao ativados quando desbloqueado.

---

## Pipeline automatizado

### Fluxo

```
Push/PR para main
       │
       ▼
┌──────────────────┐
│  CI Pipeline     │
│  ├─ npm ci       │
│  ├─ npm run lint │
│  ├─ type-check   │
│  ├─ npm run test │
│  └─ npm run build│
└──────┬───────────┘
       │ (se CI passa)
       ▼
┌──────────────────┐
│  Deploy Pipeline │ (so em push na main, nao em PR)
│  ├─ npm ci       │
│  ├─ npm run build│
│  └─ wrangler     │
│     pages deploy │
└──────────────────┘
```

### CI Pipeline (ci.yml)

Roda em todo push e PR para main.

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

### Deploy Pipeline (deploy.yml)

Roda apenas em push na main (apos merge de PR).

```yaml
name: Deploy

on:
  push:
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

  deploy:
    runs-on: ubuntu-latest
    needs: ci
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
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name webscope --branch main
```

### Worker Deploy (worker-deploy.yml)

Deploy separado do Worker (so quando arquivos do worker/ mudam).

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: worker
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          workingDirectory: worker
```

---

## GitHub Secrets necessarios (quando Actions desbloqueado)

| Secret | Onde obter | Usado em |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard > API Tokens | Deploy CF Pages + Worker |
| `CLOUDFLARE_ACCOUNT_ID` | `90b9fa2fb0b4591bb79e75032e26d029` | Deploy CF Pages + Worker |

### Como configurar

```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
```

---

## Enquanto Actions esta bloqueado

Rodar manualmente antes de cada merge:

```bash
# Pipeline completo (type-check + test + build)
npm run ci

# Deploy manual (apos merge)
CLOUDFLARE_ACCOUNT_ID=90b9fa2fb0b4591bb79e75032e26d029 npx wrangler pages deploy dist --project-name webscope --branch main
```

---

## Status checks (quando Actions desbloqueado)

Ativar branch protection com status checks:

```
GitHub repo → Settings → Branches → Add rule
- Branch name pattern: main
- Require status checks to pass before merging: ON
- Status checks: CI (o nome do job)
- Require branches to be up to date: ON
```

Isso garante que:
1. Todo PR passa pelo CI antes de ser mergeado
2. A branch esta atualizada com main antes do merge
3. Ninguem pode mergear com testes falhando

---

## Fluxo manual atual (pre-Actions)

```
1. Criar branch feature/...
2. Implementar + commitar
3. npm run ci (local)
4. git push -u origin feature/...
5. gh pr create
6. Self-review no GitHub
7. Squash merge
8. Deploy manual: npm run deploy
```

Quando Actions for desbloqueado:
- Steps 3 e 8 passam a ser automaticos
- Step 6 inclui verificacao de status checks
