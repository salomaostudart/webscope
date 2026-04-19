# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | :white_check_mark: |
| older releases | :x: |

## Reporting a Vulnerability

**Nunca** abra issue publica para reportar vulnerabilidade. Use um dos canais privados abaixo.

### Canais

1. **Email:** `salomaostudart@gmail.com` (subject: `[security] webscope — <descricao breve>`)
2. **GitHub Security Advisory:** https://github.com/salomaostudart/webscope/security/advisories/new

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
- [Compliance (LGPD)](docs/security/08-compliance.md)
- [Incident response](docs/security/09-incident-response.md)
- [SBOM](docs/security/10-sbom.md)

Auditoria automatizada: `/security-audit` (Claude Code skill em `.claude/skills/security-audit/`).

## Compliance

- **LGPD (Brasil):** dados de URL analisada e IP de cliente sao processados para fins legitimos de auditoria web. Sem coleta de dados pessoais sensiveis. Dados de audit salvos em Cloudflare D1 (regiao: automatica). Direito de exclusao: DELETE /audits (admin token necessario).

## Acknowledgments

Reporters listados com permissao em [Hall of Fame](docs/security/hall-of-fame.md) (criar apos primeiro reporter).
