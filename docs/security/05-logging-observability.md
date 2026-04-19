# 05 — Logging e Observability

Stack: Cloudflare Workers + TypeScript
Referencias: CF Workers Observability docs, OWASP Logging Cheat Sheet

---

## Principios

- **Log comportamento, nao dados:** registrar o que aconteceu, nunca o conteudo sensivel.
- **Structured logging:** JSON por padrao — parseable por qualquer sistema de analise.
- **Redaction obrigatoria:** PII, tokens e senhas nunca aparecem em logs.
- **Retenção proporcional:** logs de autenticacao 90 dias; debug 7 dias.

---

## O que logar

```typescript
// Eventos obrigatorios
type LogEvent =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.logout"
  | "auth.token.refresh"
  | "auth.token.invalid"
  | "access.denied"          // 403
  | "request.error"          // 4xx/5xx
  | "data.write"             // mutations criticas
  | "admin.action"           // acoes de admin
  | "security.alert";        // anomalias detectadas
```

```typescript
// Estrutura de log padrao
interface LogEntry {
  timestamp: string;        // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  event: string;            // auth.login.success
  requestId: string;        // rastreabilidade
  userId?: string;          // ID anonimizado, nunca email/CPF
  ip?: string;              // truncado: 192.168.x.x
  method?: string;          // GET, POST
  path?: string;            // /api/users (sem query string com dados)
  statusCode?: number;
  durationMs?: number;
  error?: string;           // mensagem de erro (sem stack trace em producao)
}
```

---

## O que NUNCA logar

```typescript
// PROIBIDO — nunca aparecer em logs
const NEVER_LOG = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "cpf",
  "cnpj",
  "credit_card",
  "card_number",
  "cvv",
  "ssn",
  "email",          // se nao necessario para rastreabilidade
  "phone",
  "address",
];
```

---

## Structured logging no Worker

```typescript
// src/lib/logger.ts
export class Logger {
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  private write(level: string, event: string, data: Record<string, unknown> = {}) {
    // Redact antes de logar
    const sanitized = this.redact(data);
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      requestId: this.requestId,
      ...sanitized,
    };

    console.log(JSON.stringify(entry));
  }

  private redact(data: Record<string, unknown>): Record<string, unknown> {
    const SENSITIVE_KEYS = ["password", "token", "secret", "key", "authorization", "cookie"];
    const result: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        result[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        result[k] = this.redact(v as Record<string, unknown>);
      } else {
        result[k] = v;
      }
    }

    return result;
  }

  info(event: string, data?: Record<string, unknown>) {
    this.write("info", event, data);
  }

  warn(event: string, data?: Record<string, unknown>) {
    this.write("warn", event, data);
  }

  error(event: string, data?: Record<string, unknown>) {
    this.write("error", event, data);
  }
}

// Uso no Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const logger = new Logger(requestId);

    logger.info("request.received", {
      method: request.method,
      path: new URL(request.url).pathname,
      // Nao logar query string — pode conter tokens
    });

    try {
      const response = await handleRequest(request, env, logger);
      logger.info("request.completed", { statusCode: response.status });
      return response;
    } catch (err) {
      logger.error("request.error", {
        error: err instanceof Error ? err.message : "unknown",
        // Nao logar stack trace em producao
      });
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
```

---

## Redaction de IP

```typescript
// Truncar ultimo octeto do IPv4 para conformidade LGPD/GDPR
function truncateIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }
  // IPv6: manter apenas primeiros 3 grupos
  const v6parts = ip.split(":");
  return v6parts.slice(0, 3).join(":") + ":...";
}

// CF Workers: obter IP do header CF-Connecting-IP
const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
logger.info("request.received", { ip: truncateIp(ip) });
```

---

## Cloudflare Workers Observability

```toml
# wrangler.toml
[observability]
enabled = true

[observability.logs]
invocation_logs = true
head_sampling_rate = 1  # 0-1, 1 = 100% das requests
```

```bash
# Ver logs em tempo real (desenvolvimento)
wrangler tail --format=pretty

# Filtrar por status code
wrangler tail --status=500 --format=pretty

# Filtrar por IP especifico
wrangler tail --ip=192.168.1.1 --format=pretty

# Output em JSON para pipe
wrangler tail --format=json | jq '.logs[].message'
```

---

## Checklist

- [ ] `Logger` centralizado implementado (nao usar `console.log` direto)
- [ ] Redaction configurada para todos os campos sensiveis
- [ ] `requestId` propagado em todas as respostas (`X-Request-ID` header)
- [ ] IP truncado antes de logar
- [ ] `invocation_logs = true` no `wrangler.toml`
- [ ] Logs em JSON estruturado (nao texto livre)
- [ ] Stack traces nao aparecem em producao
- [ ] Retenção de logs configurada (CF: 3 dias por padrao, Logpush para longo prazo)

---

## Anti-patterns

```typescript
// ERRADO: logar request body inteiro
console.log("Body:", await request.json());

// ERRADO: logar headers completos
console.log("Headers:", Object.fromEntries(request.headers));

// ERRADO: logar env var
console.log("Key:", env.SUPABASE_SERVICE_ROLE_KEY);

// ERRADO: texto livre sem estrutura
console.log(`User ${email} logged in from ${ip}`);

// ERRADO: stack trace em producao
console.error(err.stack);

// CERTO: structured + redacted
logger.info("auth.login.success", { userId: user.id, ip: truncateIp(ip) });
```

---

## Referencias

- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)
- [Cloudflare Logpush](https://developers.cloudflare.com/logs/get-started/)
- [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [LGPD Art. 46 — seguranca de dados pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
