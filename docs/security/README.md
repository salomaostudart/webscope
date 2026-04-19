# Security — cloudflare-bootstrap

Abordagem defense-in-depth para stack Cloudflare Workers + Astro + TypeScript + Supabase.

## Principios

- **Least privilege:** cada componente acessa apenas o que precisa.
- **Zero Trust:** nao confiar em nenhuma rede ou identidade sem verificacao continua.
- **Shift left:** seguranca validada antes do commit, nao apos o deploy.
- **Auditabilidade:** tudo logado em formato estruturado, nunca dados sensiveis.

---

## Tabela de conteudo

| # | Arquivo | Topico |
|---|---------|--------|
| 01 | [secrets-management.md](01-secrets-management.md) | Variaveis de ambiente, rotacao, CF API tokens |
| 02 | [supply-chain.md](02-supply-chain.md) | npm audit, lockfiles, SBOM, typosquatting |
| 03 | [pre-commit-hooks.md](03-pre-commit-hooks.md) | gitleaks, semgrep, detect-secrets |
| 04 | [vulnerability-disclosure.md](04-vulnerability-disclosure.md) | SECURITY.md, SLA, coordinated disclosure |
| 05 | [logging-observability.md](05-logging-observability.md) | O que logar, redaction, CF Workers observability |
| 06 | [zero-trust.md](06-zero-trust.md) | MFA, short-lived tokens, Cloudflare Access |
| 07 | [iam-auth.md](07-iam-auth.md) | CF API tokens, Supabase RLS, GitHub permissions |
| 08 | [compliance.md](08-compliance.md) | LGPD, SOC 2, ISO 27001, GDPR |
| 09 | [incident-response.md](09-incident-response.md) | NIST 800-61r2, runbook, post-mortem |
| 10 | [sbom.md](10-sbom.md) | CycloneDX, cdxgen, CVE monitoring |

---

## Skills externas referenciadas

Estas skills do ecossistema awesome-agent-skills complementam os docs locais:

| Skill | Uso |
|-------|-----|
| `trailofbits/static-analysis` | Analise estatica de codigo TS/JS antes de merge |
| `trailofbits/insecure-defaults` | Detectar configuracoes inseguras em dependencias |
| `trailofbits/semgrep-rule-creator` | Criar regras semgrep customizadas para o projeto |
| `openai/security-best-practices` | Boas praticas gerais de seguranca para AI-augmented apps |
| `openai/security-threat-model` | Threat modeling estruturado (STRIDE) |
| `openai/security-ownership-map` | Mapeamento de donos por area de seguranca |

---

## Fluxo: /security-audit

O orquestrador `/security-audit` itera pelas 10 areas nesta ordem de prioridade:

```
1. secrets-management    -> verificar .env, wrangler secrets, rotacao
2. pre-commit-hooks      -> gitleaks ativo? semgrep configurado?
3. supply-chain          -> npm audit limpo? lockfile commitado?
4. iam-auth              -> RLS ativo? tokens com least-privilege?
5. zero-trust            -> MFA habilitado? tokens com exp curto?
6. logging-observability -> PII nos logs? structured logging?
7. vulnerability-disclosure -> SECURITY.md na raiz?
8. incident-response     -> runbook documentado?
9. compliance            -> LGPD/GDPR verificado?
10. sbom                 -> SBOM gerado e monitorado?
```

Cada area retorna: `[OK | WARN | FAIL]` com descricao e acao sugerida.

---

## Referencias principais

- [Cloudflare Security docs](https://developers.cloudflare.com/fundamentals/security/)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [SOC 2 Type II overview](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
