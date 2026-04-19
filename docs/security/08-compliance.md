# 08 — Compliance

Stack: Cloudflare + Supabase + TypeScript
Frameworks: LGPD, SOC 2 Type II, ISO 27001, GDPR

---

## Principios

- **Privacy by design:** protecao de dados incorporada desde a arquitetura.
- **Documentar o que processa:** saber exatamente quais dados pessoais sao coletados e por que.
- **Preferir processamento minimo:** coletar apenas o necessario para a funcionalidade.
- **Certificacoes dos provedores:** Cloudflare e Supabase ja tem certificacoes — aproveitar.

---

## LGPD — Lei Geral de Protecao de Dados (Brasil)

Lei 13.709/2018. Aplicavel a qualquer processamento de dados de pessoas fisicas no Brasil.

### Bases legais (Art. 7)

| Base legal | Quando usar |
|------------|------------|
| Consentimento | Newsletter, marketing, cookies opcionais |
| Execucao de contrato | Cadastro para uso do servico |
| Interesse legitimo | Analytics anonimizado, seguranca |
| Cumprimento de obrigacao legal | Nota fiscal, dados fiscais |
| Protecao da vida | Emergencias |

```typescript
// Implementar registro de consentimento
interface ConsentRecord {
  userId: string;
  purpose: string;       // "newsletter" | "analytics" | "marketing"
  granted: boolean;
  timestamp: string;     // ISO 8601
  ipHash: string;        // hash do IP, nao o IP raw
  version: string;       // versao da politica de privacidade
}

// Armazenar em tabela auditavel com RLS
// Nunca deletar registros de consentimento — historico obrigatorio
```

### Direitos do titular (Art. 18)

Implementar endpoints para:

| Direito | Endpoint | Prazo de resposta |
|---------|----------|-------------------|
| Confirmacao de existencia | GET /privacy/data | 15 dias |
| Acesso aos dados | GET /privacy/export | 15 dias |
| Correcao | PATCH /privacy/data | 15 dias |
| Anonimizacao/exclusao | DELETE /privacy/data | 15 dias |
| Portabilidade | GET /privacy/export?format=json | 15 dias |
| Revogacao de consentimento | DELETE /privacy/consent | Imediato |

```typescript
// src/routes/privacy.ts — exemplo de endpoint de exportacao
export async function handleDataExport(request: Request, env: Env): Promise<Response> {
  const userId = await getAuthenticatedUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Coletar todos os dados do usuario
  const [profile, orders, consents] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase.from("orders").select("*").eq("user_id", userId),
    supabase.from("consent_records").select("*").eq("user_id", userId),
  ]);

  const exportData = {
    exportDate: new Date().toISOString(),
    userId,
    profile: profile.data,
    orders: orders.data,
    consents: consents.data,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${userId}.json"`,
    },
  });
}
```

### DPO (Data Protection Officer)

LGPD exige DPO para a maioria das organizacoes. Para startups/projetos pequenos:
- Nomear responsavel interno ou contratar DPO externo
- Publicar contato do DPO na politica de privacidade
- Registrar tratamentos em RIPD (Relatorio de Impacto a Protecao de Dados)

---

## SOC 2 Type II — readiness

SOC 2 avalia controles ao longo do tempo (minimo 6 meses). 5 Trust Service Criteria:

| Criterio | Controles chave |
|----------|----------------|
| Seguranca (CC) | MFA, criptografia, controle de acesso, monitoramento |
| Disponibilidade (A) | SLA, redundancia, backup, disaster recovery |
| Confidencialidade (C) | Classificacao de dados, criptografia em repouso |
| Integridade de processamento (PI) | Validacao de inputs, auditoria de transacoes |
| Privacidade (P) | LGPD/GDPR, consentimento, retencao, exclusao |

### Controles tecnicos minimos para SOC 2

```bash
# 1. Criptografia em transito
# Cloudflare: HTTPS obrigatorio, TLS 1.3
# wrangler.toml nao tem config especifica — CF gerencia TLS automaticamente

# 2. Criptografia em repouso
# Supabase: dados criptografados em repouso (AES-256) — out of the box
# R2: criptografia em repouso habilitada por padrao

# 3. Backup
# Supabase: backups automaticos diarios (plano Pro+)
# Configurar retencao de 30 dias minimo

# 4. Logging de auditoria
# Implementar audit log para acoes sensiveis (ver 05-logging-observability.md)
```

```sql
-- Audit log table no Supabase
CREATE TABLE public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,           -- "user.login" | "data.export" | "admin.delete"
  resource_type TEXT,             -- "profile" | "order" | "user"
  resource_id TEXT,
  changes JSONB,                  -- {before: {...}, after: {...}} — sem dados sensiveis
  ip_hash TEXT,                   -- hash do IP
  user_agent TEXT
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ler; ninguem pode deletar
CREATE POLICY "admin_read_audit_log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

---

## ISO 27001 — Annex A (controles relevantes)

| Controle | Descricao | Implementacao |
|----------|-----------|---------------|
| A.5.15 | Controle de acesso | Supabase RLS + CF Access |
| A.5.17 | Informacoes de autenticacao | Secrets management (doc 01) |
| A.8.7 | Protecao contra malware | Pre-commit hooks (doc 03) |
| A.8.8 | Gestao de vulnerabilidades | npm audit + Dependabot |
| A.8.12 | Prevencao de vazamento de dados | Redaction em logs (doc 05) |
| A.8.15 | Logging | Structured logs + audit trail |
| A.8.24 | Uso de criptografia | TLS 1.3 + AES-256 |
| A.8.32 | Mudancas em sistemas | PR review + CI/CD gates |

---

## GDPR — General Data Protection Regulation (EU)

Aplicavel se o projeto atende usuarios na UE.

### Requisitos adicionais vs LGPD

- **DPA (Data Processing Agreement):** necessario com Cloudflare e Supabase como processadores.
  - Cloudflare DPA: disponivel em https://www.cloudflare.com/cloudflare-customer-dpa/
  - Supabase DPA: disponivel no dashboard (Settings -> Legal)
- **Data Subject Rights:** 30 dias para resposta (vs 15 dias da LGPD)
- **Breach notification:** 72 horas para notificar autoridade (ANPD para BR, DPA local para EU)
- **Legal basis documentation:** documentar base legal para cada processamento

```bash
# Configurar regiao de dados no Supabase
# Preferir eu-central-1 (Frankfurt) para dados de usuarios europeus
# O dado nao sai da EU — conformidade com GDPR Art. 44
```

---

## Certificacoes dos provedores

| Provedor | Certificacoes |
|----------|---------------|
| Cloudflare | SOC 2 Type II, ISO 27001, PCI DSS Level 1, FedRAMP |
| Supabase | SOC 2 Type II, HIPAA (plano Enterprise) |
| GitHub | SOC 2 Type II, ISO 27001 |

Verificar certificacoes atuais:
- Cloudflare: https://www.cloudflare.com/trust-hub/compliance-resources/
- Supabase: https://supabase.com/security

---

## Checklist

- [ ] Bases legais documentadas para cada tipo de dado coletado
- [ ] Endpoints de direitos do titular implementados
- [ ] Registro de consentimento com timestamp e versao
- [ ] DPO designado (ou responsavel interno)
- [ ] DPA assinado com Cloudflare e Supabase
- [ ] Audit log implementado para acoes criticas
- [ ] Backup automatico configurado (Supabase Pro+)
- [ ] TLS 1.3 ativo (Cloudflare gerencia automaticamente)
- [ ] Processo de notificacao de breach documentado (72h)
- [ ] RIPD (Relatorio de Impacto) elaborado

---

## Referencias

- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Autoridade Nacional de Protecao de Dados](https://www.gov.br/anpd/)
- [GDPR — Regulamento (UE) 2016/679](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679)
- [AICPA SOC 2](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
- [ISO 27001:2022](https://www.iso.org/standard/82875.html)
- [Cloudflare Trust Hub](https://www.cloudflare.com/trust-hub/)
- [Supabase Security](https://supabase.com/security)
