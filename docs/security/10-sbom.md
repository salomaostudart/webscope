# 10 — SBOM (Software Bill of Materials)

Stack: npm + TypeScript + Cloudflare Workers
Formato: CycloneDX 1.6 (padrao 2026)

---

## Principios

- **Visibilidade total:** saber exatamente o que esta em producao, incluindo dependencias transitivas.
- **Automacao:** SBOM gerado pelo CI, nao manualmente.
- **Monitoramento continuo:** CVEs novos afetando dependencias detectados automaticamente.
- **SBOM como artefato:** versionado junto com releases.

---

## O que e um SBOM

SBOM e um inventario formal de todos os componentes de software:

```
Aplicacao
├── @supabase/supabase-js@2.49.4
│   ├── @supabase/auth-js@2.68.0
│   ├── @supabase/realtime-js@2.11.1
│   └── cross-fetch@4.0.0
├── hono@4.7.5
│   └── hono (sem deps externas — design proposital)
└── jose@5.10.0
```

O SBOM responde: "quais componentes, em quais versoes, com quais licencas, com quais vulnerabilidades conhecidas?"

---

## Formato CycloneDX

CycloneDX e o formato padrao em 2026 (adotado por CISA, Executive Order 14028, ISO/IEC 5962).

```bash
# Instalar cdxgen (gerador CycloneDX recomendado 2026)
npm install -g @cyclonedx/cdxgen

# Gerar SBOM completo (inclui dependencias transitivas)
cdxgen -t npm -o sbom.json --deep

# Verificar o SBOM gerado
cat sbom.json | jq '.components | length'  # numero de componentes
cat sbom.json | jq '.components[].name'    # listar nomes
cat sbom.json | jq '.components[] | select(.vulnerabilities != null)'  # com CVEs
```

### Alternativa: cyclonedx-npm (oficial)

```bash
# Instalar
npm install --save-dev @cyclonedx/cyclonedx-npm

# Gerar SBOM apenas de dependencias de producao
npx @cyclonedx/cyclonedx-npm \
  --omit=dev \
  --output-format JSON \
  --output-file sbom.json \
  --mc-version "1.6"

# Adicionar ao package.json scripts
# "sbom": "cyclonedx-npm --omit=dev --output-format JSON --output-file sbom.json"
```

---

## Estrutura do SBOM (CycloneDX 1.6)

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:<uuid>",
  "version": 1,
  "metadata": {
    "timestamp": "2026-04-18T00:00:00Z",
    "tools": [{ "name": "cdxgen", "version": "10.x" }],
    "component": {
      "type": "application",
      "name": "cloudflare-bootstrap",
      "version": "1.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "@supabase/supabase-js",
      "version": "2.49.4",
      "purl": "pkg:npm/%40supabase/supabase-js@2.49.4",
      "licenses": [{ "license": { "id": "MIT" } }],
      "hashes": [
        { "alg": "SHA-256", "content": "<hash>" }
      ]
    }
  ],
  "vulnerabilities": []
}
```

---

## CVE Monitoring

### GitHub Dependabot (automatico)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Sao_Paulo"
    open-pull-requests-limit: 10
    labels:
      - "security"
      - "dependencies"
    reviewers:
      - "salomaostudart"
    # Agrupar updates de patch version (menos ruido)
    groups:
      patch-updates:
        update-types:
          - "patch"
```

### Snyk (varredura mais profunda)

```bash
# Instalar Snyk CLI
npm install -g snyk

# Autenticar
snyk auth

# Varredura de vulnerabilidades
snyk test

# Varredura com output JSON
snyk test --json > snyk-report.json

# Monitoramento continuo (envia ao dashboard Snyk)
snyk monitor

# Varredura do SBOM gerado
snyk sbom test --file=sbom.json
```

### npm audit (built-in)

```bash
# Varredura basica
npm audit --omit=dev

# Output JSON para processar no CI
npm audit --json --omit=dev | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical")'

# Verificar apenas producao (sem devDeps)
npm audit --omit=dev --audit-level=high
```

---

## Automacao no CI/CD

```yaml
# .github/workflows/sbom.yml
name: Generate SBOM

on:
  push:
    branches: [main]
    paths:
      - "package.json"
      - "package-lock.json"
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate SBOM
        run: |
          npm install -g @cyclonedx/cdxgen
          cdxgen -t npm -o sbom.json --deep

      - name: Audit vulnerabilities
        run: npm audit --omit=dev --audit-level=high

      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ github.sha }}
          path: sbom.json
          retention-days: 90

      - name: Attach SBOM to release
        if: github.event_name == 'release'
        run: |
          gh release upload ${{ github.event.release.tag_name }} sbom.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Executive Order 14028 (EO 14028 — US)

O EO 14028 (maio 2021) tornou SBOM obrigatorio para software vendido ao governo federal dos EUA. Relevante como referencia de boas praticas global:

- SBOM deve cobrir dependencias de primeiro e segundo nivel
- Formato aceito: CycloneDX ou SPDX
- Campos minimos obrigatorios: nome do componente, versao, fornecedor, identificador unico, relacionamentos de dependencia, autor do SBOM, timestamp

Mesmo sem vender para o governo dos EUA, seguir o padrao EO 14028 facilita:
- Auditoria por clientes enterprise
- SOC 2 readiness (ver `08-compliance.md`)
- Due diligence em M&A

---

## Verificacao de licencas

```bash
# Verificar licencas de todas as dependencias
npx license-checker --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause" --excludePrivatePackages

# Output JSON
npx license-checker --json > licenses.json
```

Licencas problematicas para software comercial:
- GPL v2/v3 (copyleft forte — contaminante)
- AGPL v3 (copyleft + network use)
- LGPL (verificar caso a caso)

---

## Checklist

- [ ] `cdxgen` ou `cyclonedx-npm` instalado
- [ ] `sbom.json` gerado e versionado (ou como artefato de release)
- [ ] Dependabot configurado (`.github/dependabot.yml`)
- [ ] `npm audit` rodando no CI com `--audit-level=high`
- [ ] Licencas verificadas (sem GPL incompativel com o modelo de negocio)
- [ ] SBOM anexado a releases (via `gh release upload`)
- [ ] Processo de atualizacao de dependencias vulneraveis documentado

---

## Anti-patterns

```bash
# ERRADO: gerar SBOM manualmente e esquecer de atualizar
# CERTO: SBOM gerado automaticamente no CI a cada merge em main

# ERRADO: ignorar vulnerabilidades de severidade media
npm audit --audit-level=critical  # ignora high/medium

# ERRADO: nao commitar lockfile
echo "package-lock.json" >> .gitignore  # impossibilita reproducao exata

# ERRADO: usar --force para suprimir vulnerabilidades
npm audit fix --force  # pode quebrar a aplicacao
```

---

## Referencias

- [CycloneDX specification](https://cyclonedx.org/specification/overview/)
- [cdxgen](https://github.com/CycloneDX/cdxgen)
- [@cyclonedx/cyclonedx-npm](https://github.com/CycloneDX/cyclonedx-node-npm)
- [CISA SBOM resources](https://www.cisa.gov/sbom)
- [NTIA SBOM minimum elements](https://www.ntia.gov/files/ntia/publications/sbom_minimum_elements_report.pdf)
- [Executive Order 14028](https://www.federalregister.gov/documents/2021/05/17/2021-10460/improving-the-nations-cybersecurity)
- [GitHub Dependabot docs](https://docs.github.com/en/code-security/dependabot)
