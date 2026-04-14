# Seguranca OWASP Top 10 — WebScope

Adaptado do `PLANO_SEGURANCA_OWASP_ASTRO.md` do growth-dashboard para a stack do WebScope: Astro 6 + TypeScript + Cloudflare Workers + Supabase.

---

## Ameacas especificas do WebScope

O WebScope tem ameacas unicas porque:
1. **Recebe URLs do usuario** — risco de SSRF via Worker
2. **Faz fetch de HTML externo** — risco de XSS ao exibir dados
3. **Envia dados para IA** — risco de data exfiltration
4. **Armazena auditorias** — risco de acesso nao autorizado ao historico

---

## OWASP Top 10 — Aplicado ao WebScope

### A01 — Broken Access Control

**Onde se aplica:**
- Historico de auditorias (filtrado por user_id)
- Edge Function de AI (rate limit por IP)
- Supabase RLS nas tabelas ws_audits e ws_findings

**Verificacoes:**
- [ ] RLS ativo em todas as tabelas do Supabase
- [ ] Historico so retorna auditorias do usuario logado
- [ ] Edge Function valida JWT antes de acessar dados do usuario
- [ ] Worker nao expoe dados internos em respostas de erro
- [ ] Nao ha rotas de API sem protecao de auth (quando auth for implementado)

**Como testar:**
```bash
# Verificar que usuario A nao ve auditorias de usuario B
# Tentar acessar /api com token invalido
# Verificar que anon so ve auditorias sem user_id
```

### A02 — Security Misconfiguration

**Onde se aplica:**
- Headers de seguranca no Cloudflare Pages (`public/_headers`)
- Configuracao do Astro (`astro.config.mjs`)
- Variaveis de ambiente (PUBLIC_ vs privadas)
- CORS no Worker

**Verificacoes:**
- [ ] `_headers` configurado com CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [ ] CSP com domains corretos (googleapis, supabase, worker)
- [ ] HSTS com max-age >= 1 ano (31536000), includeSubDomains, preload
- [ ] Worker CORS restrito a webscope.sal.dev.br + localhost (dev)
- [ ] Nenhuma variavel sensivel com prefixo PUBLIC_ (PUBLIC_ = exposta ao browser)
- [ ] Worker nao retorna headers internos do site analisado para o browser
- [ ] Astro output: 'static' (sem SSR, reduz superficie de ataque)

**Como testar:**
```bash
SITE="https://webscope.sal.dev.br"
curl -sI "$SITE" | grep -iE "x-frame|x-content|content-security|strict-transport|referrer|permissions"
curl -sI -H "Origin: https://evil.com" -X OPTIONS "$SITE" | grep -i "access-control"
```

### A03 — Vulnerable Components (Supply Chain)

**Onde se aplica:**
- npm dependencies (Astro, ECharts, Zod, Supabase)
- Worker dependencies (Wrangler)
- CDN resources (Google Fonts)

**Verificacoes:**
- [ ] `npm audit` sem vulnerabilidades critical/high
- [ ] Dependencias atualizadas (npm outdated)
- [ ] Google Fonts via link (nao via CDN JS)
- [ ] Nenhum script externo sem SRI (Subresource Integrity)
- [ ] gitleaks rodado no historico completo

**Como testar:**
```bash
cd ~/Desktop/Projetos/webscope
npm audit
npm outdated
gitleaks detect --source . --report-format json --report-path gitleaks-report.json
```

### A04 — Cryptographic Failures

**Onde se aplica:**
- Supabase Auth (JWT tokens)
- localStorage (theme preference — ok, nao sensivel)
- Comunicacao com Worker e APIs

**Verificacoes:**
- [ ] Todo o trafego via HTTPS (site, worker, supabase, PSI API)
- [ ] Nenhum secret hardcoded no codigo-fonte
- [ ] Supabase anon key e publica (por design) — service role key so na Edge Function
- [ ] localStorage so armazena dados nao-sensiveis (theme, cache de UI)
- [ ] Nenhum http:// em src/ (exceto localhost para dev)

**Como testar:**
```bash
grep -rn "http://" ./src --include="*.astro" --include="*.ts" | grep -v "localhost\|127.0.0.1\|//comment"
grep -rn "localStorage\|sessionStorage" ./src --include="*.astro" --include="*.ts"
```

### A05 — Injection

**Onde se aplica:**
- XSS: dados de sites externos exibidos na UI (titulos, meta tags, headings)
- SQL: queries ao Supabase (parametrizadas pelo client)
- SSRF: URLs fornecidas pelo usuario ao Worker

**Verificacoes:**
- [ ] Nenhum `innerHTML`, `is:raw`, `set-html` com dados externos
- [ ] Astro `{}` escapa automaticamente — verificar que esta sendo usado
- [ ] Supabase client usa queries parametrizadas (`.select()`, `.eq()`, etc.)
- [ ] Worker valida URLs (anti-SSRF): rejeitar IPs privados, protocolos nao-HTTP, localhost
- [ ] Nenhum `eval()`, `new Function()`, `execSync` com dados do usuario

**Como testar:**
```bash
grep -rn "innerHTML\|set-html\|is:raw\|dangerouslySet" ./src --include="*.astro" --include="*.ts"
grep -rn "\beval(\|new Function(" ./src --include="*.ts"
```

### A06 — Insecure Design

**Onde se aplica:**
- Rate limiting no Worker (10 auditorias/hora por IP)
- Rate limiting na Edge Function de AI (20 requests/hora)
- Cache de resultados (nao re-auditar mesma URL em < 5 minutos)
- Timeout no Worker (10s)
- Limite de tamanho de resposta (5MB)
- Validacao de URL com Zod

**Verificacoes:**
- [ ] Rate limiting implementado no Worker
- [ ] Rate limiting implementado na Edge Function
- [ ] Timeout de 10s no fetch do Worker
- [ ] Resposta limitada a 5MB
- [ ] URLs validadas com Zod ou funcao dedicada
- [ ] Nao e possivel fazer DoS no site via auditorias em loop
- [ ] Link checker limitado a 50 links por auditoria

### A07 — Authentication Failures

**Onde se aplica:**
- Supabase Auth (magic link)
- JWT tokens
- Session management

**Verificacoes:**
- [ ] Auth via Supabase (nao implementacao propria)
- [ ] Magic link (sem senhas para armazenar)
- [ ] JWT validado pelo Supabase client
- [ ] Nenhum secret hardcoded para auth
- [ ] Logout limpa sessao corretamente

### A08 — Software and Data Integrity

**Onde se aplica:**
- CI/CD pipeline (GitHub Actions — quando desbloqueado)
- Scripts externos (Google Fonts)
- JSON.parse de dados da PSI API e Worker

**Verificacoes:**
- [ ] Google Fonts via link (nao script executavel)
- [ ] JSON.parse com try/catch em todas as respostas de APIs externas
- [ ] CI pipeline roda lint + test + build antes de deploy
- [ ] Nenhum script externo sem SRI

### A09 — Logging & Monitoring

**Onde se aplica:**
- Erros de auditoria
- Rate limit violations
- Edge Function usage

**Verificacoes:**
- [ ] Nenhum dado sensivel em console.log (tokens, emails, senhas)
- [ ] Erros de Worker logados sem expor dados internos
- [ ] Edge Function loga uso (quantidade de requests, nao conteudo)
- [ ] Em producao, console.log removidos ou controlados

**Como testar:**
```bash
grep -rn "console\.log" ./src --include="*.ts" --include="*.astro" | grep -iE "password|token|secret|email"
```

### A10 — Server-Side Request Forgery (SSRF)

**Onde se aplica:**
- **O Worker e o principal vetor de SSRF** — recebe URL do usuario e faz fetch server-side

**Verificacoes:**
- [ ] URLs validadas antes do fetch: rejeitar IPs privados
- [ ] Protocolos restritos a http:// e https://
- [ ] Hostnames bloqueados: localhost, *.local, metadata endpoints
- [ ] Timeout curto (10s)
- [ ] Resposta limitada (5MB)
- [ ] User-Agent identificavel (WebScope/1.0)

**IPs privados que devem ser bloqueados:**
```
127.x.x.x (loopback)
10.x.x.x (RFC 1918)
172.16-31.x.x (RFC 1918)
192.168.x.x (RFC 1918)
169.254.x.x (link-local)
0.x.x.x
::1 (IPv6 loopback)
fc00: (IPv6 ULA)
fe80: (IPv6 link-local)
```

---

## Quando executar auditoria

1. **Ao finalizar cada fase:** verificar items relevantes da fase
2. **Ao finalizar v1 (Fase 4):** auditoria completa (4 agentes paralelos em sonnet)
3. **Antes de tornar repo publico (Fase 7):** auditoria completa + gitleaks no historico

### Auditoria completa (4 agentes paralelos)

| Agente | Escopo |
|---|---|
| Engine/Codigo | Injection, access control, crypto, error handling |
| Testes | Cobertura, cenarios de seguranca, mocks realistas |
| Seguranca | Headers, OWASP, SSRF, XSS, supply chain |
| Documentacao | README, ANALYZERS.md, About page, env vars documentadas |

### Checklist pre-release

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
- [ ] Edge Function valida JWT
- [ ] Dados enviados pra IA sao findings resumidos, nao HTML completo
- [ ] npm audit sem vulnerabilidades critical/high
- [ ] Dependencias atualizadas

---

## Security headers (referencia rapida)

Arquivo: `public/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://www.googleapis.com https://*.supabase.co wss://*.supabase.co https://webscope-api.salomaomstudart.workers.dev
```

**Notas:**
- `connect-src` inclui: googleapis (PSI API), supabase (auth + db), worker proxy
- `unsafe-inline` em script-src: necessario pra Astro inline scripts. Eliminar com nonces se possivel.
- `unsafe-inline` em style-src: necessario pra inline styles de componentes Astro
