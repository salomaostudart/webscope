# 07 — IAM e Autenticacao

Stack: Cloudflare API + Supabase + GitHub + TypeScript
Skill externa: `openai/security-ownership-map`

---

## Principios

- **Least privilege por design:** cada identidade acessa apenas o necessario.
- **Service accounts separados de contas pessoais:** acoes automatizadas nao usam credenciais humanas.
- **Auditar acessos regularmente:** remover permissoes obsoletas.
- **Preferir OAuth / OIDC a senhas:** delegar autenticacao a provedores confiavels.

---

## Cloudflare API Tokens

### Hierarquia de permissoes

```
Account Owner
  └── Account Tokens (escopo total)
        └── Zone Tokens (escopo por dominio)
              └── Resource Tokens (escopo por recurso)
```

### Criar token com least-privilege

```bash
# Via dashboard: Cloudflare -> My Profile -> API Tokens -> Create Token

# Via API (requer token com "User:API Tokens:Edit")
curl -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "workers-deploy-only",
    "policies": [
      {
        "effect": "allow",
        "resources": {
          "com.cloudflare.api.account.<ACCOUNT_ID>": "*"
        },
        "permission_groups": [
          { "id": "f7f0eda5197f4c4b8695c7efbe064bf7", "name": "Workers Scripts:Edit" },
          { "id": "c1fde68c7bcc44588cef5f3a73c9439a", "name": "Workers Routes:Edit" }
        ]
      }
    ],
    "not_before": "2026-04-18T00:00:00Z",
    "expires_on": "2026-07-18T00:00:00Z"
  }'
```

### Tokens por funcao (separacao de responsabilidades)

| Token | Permissoes | Usado por |
|-------|-----------|-----------|
| `ci-deploy` | Workers Scripts:Edit, Routes:Edit | GitHub Actions |
| `cache-purge` | Cache Purge | CDN automation |
| `dns-update` | Zone DNS:Edit | DNS automation |
| `r2-upload` | R2 Storage:Edit (bucket especifico) | Upload scripts |
| `logs-read` | Account Analytics:Read | Monitoring |
| `admin` | Tudo | Uso humano manual, nunca em CI |

---

## Supabase — Row Level Security (RLS)

RLS e obrigatorio para qualquer tabela que contenha dados de usuario.

```sql
-- Habilitar RLS na tabela
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politica: usuario so ve seus proprios dados
CREATE POLICY "users_own_data"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politica: leitura publica de perfis (opcional)
CREATE POLICY "public_read_profiles"
  ON public.profiles
  FOR SELECT
  USING (is_public = true);

-- Politica: admin ve tudo
CREATE POLICY "admin_full_access"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

```bash
# Verificar que RLS esta ativo em todas as tabelas
# No Supabase SQL Editor:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
# rowsecurity deve ser 't' para todas as tabelas com dados de usuario
```

```typescript
// NUNCA usar service role key no cliente (frontend/browser)
// service role bypassa RLS completamente
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY  // anon key — respeitia RLS
);

// Service role: apenas no Worker, para operacoes administrativas
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY  // apenas no servidor
);
```

---

## GitHub — Fine-Grained Tokens

```bash
# Criar fine-grained token: GitHub -> Settings -> Developer settings
# -> Fine-grained tokens -> Generate new token

# Permissoes recomendadas por caso de uso:
# Deploy CI: Contents:Read, Actions:Write, Secrets:Read
# Bot de PR: Pull requests:Write, Issues:Write
# Release: Contents:Write, Releases:Write
```

```yaml
# .github/workflows/deploy.yml — usar secrets de environment, nao global
jobs:
  deploy:
    environment: production  # environment-scoped secrets
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}  # environment secret
```

### SSO obrigatorio para organizacoes

```bash
# Habilitar SSO no GitHub Org (GitHub Enterprise ou GitHub Teams)
# Organization -> Settings -> Authentication security
# Enable SAML SSO

# Autorizar tokens existentes para SSO
# Tokens nao autorizados falham silenciosamente — verificar todos
```

---

## Service accounts vs personal tokens

```
Regra: qualquer acao automatizada usa service account ou token dedicado.
       Nunca usar token pessoal em CI/CD ou automacoes.
```

```bash
# Criar bot user no GitHub (gratuito para orgs publicas)
# Nomear claramente: cloudflare-bootstrap-bot

# Configurar permissoes minimas necessarias
# Gerar fine-grained token para o bot user (nao para a conta pessoal)
```

Tabela de responsabilidades (alimentar com `/openai/security-ownership-map`):

| Recurso | Owner | Backup Owner | Token usado |
|---------|-------|--------------|-------------|
| CF Deploy | DevOps | Tech Lead | `ci-deploy` |
| Supabase migrations | Backend | DBA | `supabase-admin` |
| GitHub releases | Release Manager | DevOps | `release-bot` |
| DNS updates | Infrastructure | DevOps | `dns-update` |

---

## OAuth — quando usar e quando nao usar

```typescript
// USAR: provedores estabelecidos
// Supabase auth ja integra: GitHub, Google, Azure AD, Discord
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "github",
  options: {
    redirectTo: `${env.BASE_URL}/auth/callback`,
    scopes: "read:user user:email",  // escopo minimo
  },
});

// NAO IMPLEMENTAR: OAuth server proprio sem necessidade
// Risco alto, complexidade alta, maturidade baixa.
// Usar Supabase Auth ou Cloudflare Access como IdP.
```

---

## Checklist

- [ ] CF API tokens com least-privilege e data de expiracao
- [ ] Token separado por funcao (CI, DNS, cache, logs)
- [ ] RLS habilitado em todas as tabelas com dados de usuario
- [ ] `SELECT rowsecurity FROM pg_tables` — todas as tabelas `t`
- [ ] Supabase service role key nunca exposta no frontend
- [ ] GitHub fine-grained tokens (nao classic PATs)
- [ ] Secrets de GitHub configurados por environment (nao global)
- [ ] Automacoes usam service account, nao conta pessoal
- [ ] OAuth delegado ao Supabase (sem implementacao propria)
- [ ] Mapa de ownership documentado

---

## Anti-patterns

```typescript
// ERRADO: service role no frontend
const supabase = createClient(url, SUPABASE_SERVICE_ROLE_KEY);  // no browser

// ERRADO: token global de CI (nao restrito a environment)
// secrets.CF_API_TOKEN no nivel do repo sem environment

// ERRADO: classic PAT com permissao completa
// token com "repo" scope (acessa todos os repos da conta)

// ERRADO: OAuth proprio
// Implementar authorization server do zero

// CERTO: anon key no frontend, service role apenas no Worker
const clientSupabase = createClient(url, env.SUPABASE_ANON_KEY);
```

---

## Referencias

- [Cloudflare API Token Permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Supabase RLS docs](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub Fine-grained Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [OWASP — Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- Skill: `openai/security-ownership-map` — mapeamento de donos por area
