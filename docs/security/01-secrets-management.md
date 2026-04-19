# 01 — Secrets Management

Stack: Cloudflare Workers + Wrangler + TypeScript + Supabase
Skill externa: `trailofbits/insecure-defaults`

---

## Principios

- **Least privilege:** cada API token tem escopo minimo para a funcao que executa.
- **Separation of concerns:** segredos de dev, staging e producao nunca se misturam.
- **Rotation obrigatoria:** qualquer credencial comprometida ou com >90 dias deve ser rotacionada.
- **Never in code:** segredos nunca aparecem em arquivos versionados — nem em comentarios.

---

## Hierarquia de segredos

```
desenvolvimento local   -> .env (nunca commitado)
staging/producao       -> wrangler secret put (criptografado na CF)
CI/CD                  -> GitHub Secrets (environment-scoped)
Supabase               -> project settings + service role key via wrangler secret
```

---

## .env local

```bash
# .env.example (commitado — sem valores reais)
CF_API_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=

# .env (NUNCA commitado)
CF_API_TOKEN=real_value_here
```

Verificar `.gitignore`:

```
.env
.env.local
.env.*.local
*.pem
*.key
*.p12
*.pfx
```

---

## Wrangler secrets (producao)

```bash
# Adicionar secret no Worker de producao
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Listar secrets configurados (sem mostrar valores)
wrangler secret list

# Remover secret obsoleto
wrangler secret delete OLD_SECRET_NAME

# Para environments separados
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

Acessar no Worker:

```typescript
// src/worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const key = env.SUPABASE_SERVICE_ROLE_KEY; // injetado pelo runtime
    // nunca logar `key`
  }
};

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
}
```

---

## Cloudflare API Tokens

Principio: **um token por finalidade**, escopo minimo.

```bash
# Criar token via CLI (requer CF_API_TOKEN com permissao de criar tokens)
curl -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "cloudflare-bootstrap-deploy",
    "policies": [
      {
        "effect": "allow",
        "resources": { "com.cloudflare.api.account.zone.*": "*" },
        "permission_groups": [
          { "id": "c8fed203ed3043cba015a93ad1616f1f", "name": "Zone Read" },
          { "id": "e17beae8b8cb423197d010f33657b9e6", "name": "Cache Purge" }
        ]
      }
    ],
    "not_before": "2026-04-18T00:00:00Z",
    "expires_on": "2026-07-18T00:00:00Z"
  }'
```

Escopos minimos por funcao:

| Funcao | Permissoes necessarias |
|--------|----------------------|
| Deploy Worker | Workers Scripts:Edit |
| Purge cache | Cache Purge |
| DNS update | Zone DNS:Edit |
| R2 upload | Workers R2 Storage:Edit |
| Logs read | Account Analytics:Read |

---

## Rotation schedule

| Tipo de credencial | Rotacao obrigatoria |
|-------------------|---------------------|
| CF API tokens (producao) | 90 dias |
| Supabase service role key | 90 dias ou apos suspeita |
| GitHub PATs | 90 dias |
| Webhook secrets | 180 dias |
| Qualquer credencial comprometida | Imediato |

```bash
# Lembrete via crontab (ajustar para o sistema de alertas do projeto)
# 0 9 1 */3 * echo "Rotacionar CF API tokens" | mail -s "Security reminder" ops@example.com
```

---

## Checklist

- [ ] `.env` esta no `.gitignore` e nunca foi commitado
- [ ] `.env.example` existe com todas as variaveis (sem valores)
- [ ] `wrangler secret list` mostra todos os segredos de producao
- [ ] Cada CF API token tem escopo minimo necessario
- [ ] Data de expiracao configurada em todos os tokens
- [ ] Rotation schedule documentado (ver tabela acima)
- [ ] GitHub Secrets configurados por environment (nao global)
- [ ] `gitleaks` esta ativo no pre-commit (ver `03-pre-commit-hooks.md`)

---

## Anti-patterns

```typescript
// ERRADO: secret hardcoded
const apiKey = "sk_live_abc123..."; // gitleaks:allow

// ERRADO: secret em variavel de ambiente publica (cliente)
// astro.config.mjs -> PUBLIC_SUPABASE_SERVICE_KEY (nunca!)

// ERRADO: logar credencial
console.log(`Conectando com key: ${env.SUPABASE_SERVICE_ROLE_KEY}`);

// ERRADO: secret em URL
fetch(`https://api.example.com/data?token=${secret}`);

// CERTO: usar env.VAR no Worker
const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
```

---

## Referencias

- [Cloudflare Workers — Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Wrangler secret commands](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [OWASP — Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- Skill: `trailofbits/insecure-defaults` — varredura de defaults inseguros em dependencias
