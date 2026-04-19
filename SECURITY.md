# Security Policy

Template de disclosure policy. Copie para raiz do seu projeto clonado deste template e adapte os campos marcados com `<ADAPTAR>`.

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | :white_check_mark: |
| older releases | :x: |

## Reporting a Vulnerability

**Nunca** abra issue publica para reportar vulnerabilidade. Use um dos canais privados abaixo.

### Canais

1. **Email:** `<security@seudominio.com.br>` (ou `<seu-email>+security@gmail.com>` se nao tem dominio corporativo)
2. **GitHub Security Advisory:** https://github.com/`<owner>`/`<repo>`/security/advisories/new
3. **PGP:** (opcional) fingerprint `<ADAPTAR-SE-APLICAVEL>`

### Resposta esperada

| Severidade | Acknowledge | Fix target |
|-----------|-------------|------------|
| Critical (RCE, auth bypass, data leak) | 24h | 7 dias |
| High (privilege escalation, XSS exploitable) | 72h | 30 dias |
| Medium (DoS, info disclosure menor) | 1 semana | 90 dias |
| Low (best-practice, cosmetic) | 2 semanas | proxima release |

### Escopo

**In-scope:** codigo do repo, dependencies, config producao (Cloudflare Workers deploys), secrets management.

**Out-of-scope:** social engineering, DoS de infraestrutura sem vulnerabilidade real, spam, dominios nao associados ao projeto.

### Coordinated Disclosure

- Nao publicar detalhes ate fix deployado
- Apos fix: CVE opcional (solicitar via GitHub advisory) + public disclosure com credito ao reporter (se aceitar)
- Reporter recebe status updates periodicos durante triagem/fix

## Security Best Practices

Este projeto segue padroes 2026 documentados em [`docs/security/`](docs/security/):
- [Secrets management](docs/security/01-secrets-management.md)
- [Supply chain](docs/security/02-supply-chain.md)
- [Pre-commit hooks](docs/security/03-pre-commit-hooks.md)
- [Logging & observability](docs/security/05-logging-observability.md)
- [Zero Trust principles](docs/security/06-zero-trust.md)
- [IAM & auth](docs/security/07-iam-auth.md)
- [Compliance (LGPD/SOC2/ISO27001)](docs/security/08-compliance.md)
- [Incident response](docs/security/09-incident-response.md)
- [SBOM](docs/security/10-sbom.md)

Auditoria automatizada: `/security-audit` (Claude Code skill em `.claude/skills/security-audit/`).

## Compliance

- LGPD (Brasil): `<ADAPTAR-SE-APLICAVEL>` — base legal + DPO + direitos do titular
- SOC 2: `<ADAPTAR-SE-APLICAVEL>` — controls dos 5 trust criteria
- ISO 27001: `<ADAPTAR-SE-APLICAVEL>` — Annex A controls implementados

## Acknowledgments

Reporters listados com permissao em [Hall of Fame](docs/security/hall-of-fame.md) (criar apos primeiro reporter).
