# Deploy e Producao — WebScope

Infraestrutura, deploy, custom domains, rollback.

---

## Infraestrutura

| Componente | Servico | URL |
|---|---|---|
| Frontend (Pages) | Cloudflare Pages | `https://webscope.sal.dev.br` |
| Proxy API (Worker) | Cloudflare Workers | `https://webscope-api.salomaomstudart.workers.dev` |
| Auth + DB | Supabase | Projeto separado (Pro) — a ser criado |
| AI Suggestions | Supabase Edge Functions | `https://<supabase-url>/functions/v1/ai-suggestions` |
| DNS | Cloudflare DNS | Zona `sal.dev.br` |
| Repo | GitHub | `salomaostudart/webscope` (privado) |

---

## Cloudflare Pages

### Projeto
- Nome: `webscope`
- Branch de producao: `main`
- Build output: `dist/`
- Account ID: `<your-cloudflare-account-id>` (set via env var CLOUDFLARE_ACCOUNT_ID)

### Custom domain
- `webscope.sal.dev.br` → CNAME para `webscope-26x.pages.dev`
- SSL: automatico (Cloudflare gerencia certificado)
- HTTPS: forcado (redirect automatico)

### Deploy manual (enquanto Actions bloqueado)

```bash
cd ~/Desktop/Projetos/webscope
npm run build
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID npx wrangler pages deploy dist --project-name webscope --branch main
```

### Deploy automatico (quando Actions desbloqueado)

Push na main → CI passa → Deploy automatico via `deploy.yml`.

### Rollback

Cloudflare Pages mantém historico de deploys. Para rollback:

```bash
# Listar deploys anteriores
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID npx wrangler pages deployments list --project-name webscope

# Rollback para deploy especifico (via dashboard)
# Cloudflare Dashboard → Pages → webscope → Deployments → Rollback to this deployment
```

---

## Cloudflare Worker (proxy)

### Projeto
- Nome: `webscope-api`
- URL: `https://webscope-api.salomaomstudart.workers.dev`
- Config: `worker/wrangler.toml`

### Deploy

```bash
cd ~/Desktop/Projetos/webscope/worker
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID npx wrangler deploy
```

### Variaveis de ambiente do Worker

| Variavel | Valor | Como configurar |
|---|---|---|
| `ALLOWED_ORIGIN` | `https://webscope.sal.dev.br` | `wrangler.toml` (vars) |

### Custom domain para Worker (futuro)

Se necessario, adicionar custom domain `api-webscope.sal.dev.br`:
```bash
# Via Cloudflare dashboard: Workers & Pages → webscope-api → Triggers → Custom Domains
```

---

## Supabase (a ser criado)

### Plano
- Projeto separado do growth-dashboard (Pro)
- Tabelas com prefixo `ws_` (ver `docs/plano/08-schema-sql.md`)
- RLS ativo em todas as tabelas

### Componentes
- **Auth:** magic link (email)
- **Database:** PostgreSQL (tabelas ws_audits, ws_findings)
- **Edge Functions:** ai-suggestions (proxy para Claude Haiku)

### Env vars necessarias
```
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
CLAUDE_API_KEY=sk-ant-... (so na Edge Function)
```

---

## Checklist pre-deploy

Antes de cada deploy para producao:

- [ ] `npm run ci` passa (type-check + test + build)
- [ ] Nenhum secret no codigo
- [ ] `_headers` com security headers corretos
- [ ] CSP `connect-src` inclui todas as URLs necessarias
- [ ] Worker deployado e funcionando
- [ ] Testado no browser (pelo menos golden path)

---

## Monitoramento

### Metricas disponiveis

- **Cloudflare Pages:** requests, bandwidth, erros (dashboard)
- **Cloudflare Worker:** requests, CPU time, erros (dashboard)
- **Supabase:** queries, auth events, storage (dashboard)
- **PageSpeed Insights:** metricas do proprio site (self-audit)

### Alertas (futuro)

- Worker error rate > 5% → notificacao
- Deploy falhou → notificacao
- Supabase RLS violation → log

---

## Ambientes

| Ambiente | URL | Branch | Quando |
|---|---|---|---|
| Local | `http://localhost:4321` | qualquer | `npm run dev` |
| Producao | `https://webscope.sal.dev.br` | main | merge na main |

Nao ha ambiente de staging. Preview deploys do CF Pages podem ser usados para PRs (cada PR gera URL unica como `abc123.webscope-26x.pages.dev`).
