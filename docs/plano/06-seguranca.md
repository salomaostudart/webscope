# WebScope — Seguranca

## Principios

1. **Nunca confiar em input do usuario.** A URL inserida pode ser maliciosa.
2. **Secrets nunca no codigo.** Tudo via env vars.
3. **Minimo privilegio.** Cada componente so tem acesso ao que precisa.
4. **Defense in depth.** Multiplas camadas de protecao.

## Ameacas especificas do WebScope

### 1. SSRF (Server-Side Request Forgery) via Worker

**Risco:** o Worker faz fetch de URLs fornecidas pelo usuario. Um atacante pode fornecer URLs internas (127.0.0.1, metadata endpoints de cloud, etc).

**Mitigacao:**
- Validar URL antes do fetch: rejeitar IPs privados (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x)
- Rejeitar protocolos nao-HTTP (file://, ftp://, data:, javascript:)
- Rejeitar URLs sem hostname
- Timeout curto (10s) pra evitar slowloris
- Rejeitar respostas > 5MB (evitar memory exhaustion)

```typescript
// worker/src/validate-url.ts
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (!url.hostname) return false;
    // Resolver DNS e verificar IP (no Worker, fetch ja resolve)
    // Mas verificar hostname patterns
    if (PRIVATE_RANGES.some(r => r.test(url.hostname))) return false;
    if (url.hostname === 'localhost') return false;
    if (url.hostname.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}
```

### 2. XSS via HTML renderizado

**Risco:** o WebScope recebe HTML de sites externos e exibe partes dele na UI (titles, meta tags, headings). Se renderizar HTML diretamente, pode executar scripts maliciosos.

**Mitigacao:**
- Nunca usar `innerHTML` com dados externos
- Escapar todo HTML antes de exibir (Astro faz isso automaticamente com `{}`)
- Usar `textContent` ao mostrar valores extraidos
- CSP restritivo no `_headers`

### 3. Denial of Service

**Risco:** alguem pode fazer milhares de requests ao Worker ou a API do PSI.

**Mitigacao:**
- Rate limiting no Worker (por IP: 10 auditorias/hora)
- Rate limiting na Edge Function de AI (20 requests/hora)
- Cache de resultados (nao re-auditar mesma URL em < 5 minutos)
- CF Pages tem DDoS protection built-in

### 4. Data exfiltration via AI

**Risco:** o HTML do site analisado e enviado pro Claude Haiku. Se o site tiver dados sensiveis no HTML, eles vao pra API da Anthropic.

**Mitigacao:**
- Enviar apenas findings (texto resumido), nao HTML completo
- Nunca enviar cookies, tokens, ou headers de autenticacao do site analisado
- Documentar na About page que dados sao enviados pra IA
- Opcao de "Skip AI analysis" pra usuarios preocupados com privacidade

## Security Headers (Cloudflare Pages)

Arquivo `public/_headers` (mesmo padrao do growth-dashboard):

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://www.googleapis.com https://*.supabase.co wss://*.supabase.co https://api-webscope.sal.dev.br
```

**Notas:**
- `connect-src` inclui: googleapis (PSI API), supabase (auth + db), worker proxy
- `unsafe-inline` em script-src: necessario pra Astro inline scripts. Eliminar se possivel com nonces.
- `unsafe-inline` em style-src: necessario pra inline styles de componentes

## Supabase RLS

Ver `09-schema-sql.md` pra policies completas. Resumo:
- Qualquer pessoa pode criar e ler auditorias (ferramenta publica)
- Historico filtrado por user_id (so ve suas proprias auditorias)
- Edge Function usa service role key (nunca exposta ao cliente)

## Auditoria OWASP

Ao finalizar v1 (Fase 4), rodar auditoria baseada no `PLANO_SEGURANCA_OWASP_ASTRO.md` do growth-dashboard:

1. **A01 Broken Access Control** — verificar que historico e filtrado por usuario
2. **A02 Security Misconfiguration** — verificar headers, env vars, CSP
3. **A03 Vulnerable Components** — `npm audit`, dependencias atualizadas
4. **A04 Cryptographic Failures** — nenhum secret hardcoded, HTTPS everywhere
5. **A05 Injection** — nenhum innerHTML com dados externos, SQL via Supabase client (parametrizado)
6. **A06 Insecure Design** — rate limiting, validacao de URL, timeout
7. **A07 Auth Failures** — Supabase Auth (JWT), magic link
8. **A08 Integrity** — SRI em scripts externos, CI pipeline (quando Actions desbloqueado)
9. **A09 Logging** — nenhum dado sensivel em console.log, Edge Function loga uso
10. **A10 SSRF** — validacao de URL no Worker (ver acima)

## Secrets e env vars

### .env.example

```env
# Supabase (Auth + DB)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=

# Claude API (for AI Suggestions — Edge Function only)
CLAUDE_API_KEY=

# Cloudflare Worker URL (proxy)
PUBLIC_WORKER_URL=

# PageSpeed Insights API Key (optional — increases rate limit)
PSI_API_KEY=
```

### GitHub Secrets (quando Actions desbloqueado)

| Secret | Usado em |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy CF Pages |
| `SUPABASE_URL` | Edge Function deploy |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function deploy |
| `CLAUDE_API_KEY` | Edge Function |

## Checklist de seguranca pre-release

- [ ] Nenhum secret hardcoded em src/
- [ ] `.env` e `.env.local` no `.gitignore`
- [ ] gitleaks rodado no historico completo
- [ ] Headers de seguranca configurados em `_headers`
- [ ] CSP com domains corretos
- [ ] HSTS com max-age >= 1 ano
- [ ] Worker valida URLs (anti-SSRF)
- [ ] Worker tem rate limiting
- [ ] Nenhum `innerHTML` com dados externos
- [ ] Nenhum `console.log` com dados de usuarios em producao
- [ ] Supabase RLS ativo em todas as tabelas
- [ ] Edge Function valida JWT antes de acessar dados
- [ ] Dados enviados pra IA sao findings resumidos, nao HTML completo
- [ ] npm audit sem vulnerabilidades critical/high
