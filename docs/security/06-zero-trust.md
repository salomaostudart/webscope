# 06 — Zero Trust

Stack: Cloudflare Access + Workers + TypeScript
Referencias: NIST SP 800-207, Cloudflare Zero Trust docs

---

## Principios

- **Never trust, always verify:** nenhuma identidade ou rede e confiavel por padrao.
- **Assume breach:** agir como se o perimetro ja tivesse sido comprometido.
- **Least privilege:** acesso minimo necessario para cada identidade, em cada contexto.
- **Continuous verification:** revalidar identidade continuamente, nao apenas no login.

---

## MFA obrigatorio

```bash
# Cloudflare Access: exigir MFA em todas as aplicacoes
# 1. Acessar Cloudflare Zero Trust dashboard
# https://one.dash.cloudflare.com

# 2. Settings -> Authentication -> Global settings
# Enable: Require Multi-Factor Authentication

# 3. Por aplicacao
# Access -> Applications -> <app> -> Policies
# Adicionar regra: "Authentication Method is mTLS or TOTP"
```

Politica de MFA para desenvolvedores:

- GitHub: MFA obrigatorio (Settings -> Password and authentication)
- Cloudflare: MFA obrigatorio (My Profile -> Authentication -> Two-Factor Auth)
- Supabase: MFA habilitado por organizacao

---

## Short-lived tokens

```typescript
// JWT com expiracao curta — padrao recomendado 2026
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Gerar token de acesso (15 minutos)
async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")  // curto — preferir 15m para access tokens
    .sign(SECRET);
}

// Gerar refresh token (7 dias, rotacionado a cada uso)
async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

// Verificar token
async function verifyToken(token: string): Promise<{ sub: string; type: string }> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as { sub: string; type: string };
}
```

Tabela de expiracoes recomendadas:

| Tipo de token | Expiracao | Rotacao |
|---------------|-----------|---------|
| Access token | 15 minutos | A cada requisicao (silent refresh) |
| Refresh token | 7 dias | A cada uso (token rotation) |
| Session token | 24 horas | A cada login |
| API key (service) | 90 dias | Manual |
| Webhook secret | 180 dias | Manual |

---

## Cloudflare Access — setup

```bash
# 1. Criar aplicacao no Cloudflare Access
# Zero Trust -> Access -> Applications -> Add an application

# Tipo: Self-hosted
# Application domain: app.example.com
# Session duration: 24h (ajustar por sensibilidade)

# 2. Configurar Identity Provider
# Zero Trust -> Settings -> Authentication -> Add new
# Opcoes: GitHub, Google, Azure AD, Okta, SAML

# 3. Criar politica de acesso
# Allow: Email ends with @suaempresa.com AND MFA method is TOTP
# Block: Country is CN, RU (opcional, ajustar por caso de uso)
```

Validar token CF Access no Worker:

```typescript
// Verificar que a requisicao passou pelo Cloudflare Access
async function verifyCFAccessToken(request: Request, env: Env): Promise<string | null> {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;

  try {
    // Buscar chaves publicas do CF Access (cache por 1h)
    const certsUrl = `https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
    const certsResp = await fetch(certsUrl);
    const certs = await certsResp.json();

    // Verificar JWT com chaves publicas
    // Usar biblioteca jose para validacao completa
    const { payload } = await jwtVerify(jwt, /* chave publica */);
    return payload.sub as string;
  } catch {
    return null;
  }
}
```

---

## Network segmentation

Para Workers com acesso a recursos internos:

```toml
# wrangler.toml — VPC binding (CF Workers + Cloudflare Tunnel)
[[unsafe.bindings]]
name = "INTERNAL_API"
type = "secret_key"

# Ou usar Service Bindings para comunicacao Worker-to-Worker sem internet
[[services]]
binding = "AUTH_WORKER"
service = "auth-worker"
environment = "production"
```

```typescript
// Service binding: comunicacao interna sem expor endpoint publico
const authResponse = await env.AUTH_WORKER.fetch(
  new Request("https://auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
);
```

---

## Headers de seguranca

```typescript
// src/middleware/security-headers.ts
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "0");  // desabilitar — CSP e melhor
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'",
      "style-src 'self' 'nonce-{NONCE}'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return new Response(response.body, { status: response.status, headers });
}
```

---

## Checklist

- [ ] MFA obrigatorio para todos os desenvolvedores (GitHub + Cloudflare + Supabase)
- [ ] Cloudflare Access configurado para endpoints sensiveis
- [ ] JWT access tokens com expiracao <= 15 minutos
- [ ] Token rotation implementada para refresh tokens
- [ ] Security headers configurados em todas as respostas
- [ ] Service bindings usados para comunicacao Worker-to-Worker
- [ ] HSTS com preload habilitado
- [ ] CSP testado sem `unsafe-inline`

---

## Anti-patterns

```typescript
// ERRADO: token sem expiracao
new SignJWT({ sub: userId }).sign(SECRET);  // sem .setExpirationTime()

// ERRADO: sessao longa
.setExpirationTime("365d")  // muito longa

// ERRADO: verificar apenas assinatura, ignorar expiracao
jwt.verify(token, SECRET, { ignoreExpiration: true });

// ERRADO: passar token por query string
fetch(`/api/data?token=${accessToken}`);  // aparece em logs de servidor

// CERTO: passar token por header
fetch("/api/data", { headers: { Authorization: `Bearer ${accessToken}` } });
```

---

## Referencias

- [NIST SP 800-207 — Zero Trust Architecture](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)
- [Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [OWASP — JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [jose library (TypeScript JWT)](https://github.com/panva/jose)
