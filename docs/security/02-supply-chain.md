# 02 — Supply Chain Security

Stack: npm + TypeScript + Cloudflare Workers
Skill externa: `trailofbits/static-analysis`

---

## Principios

- **Trust nothing by default:** cada dependencia e um vetor de ataque potencial.
- **Lockfiles sao contrato:** o que foi testado e o que vai para producao.
- **Auditoria continua:** rodar `npm audit` antes de cada commit e no CI.
- **Minimalismo:** menos dependencias = superficie de ataque menor.

---

## npm audit

```bash
# Auditoria basica (retorna exit code 1 se houver vulnerabilidade)
npm audit

# Auditoria apenas de producao (ignora devDependencies)
npm audit --omit=dev

# Auditoria em formato JSON (para parsear no CI)
npm audit --json > audit-report.json

# Correcao automatica (apenas patches de semver compativel)
npm audit fix

# Ver detalhes de uma vulnerabilidade especifica
npm audit --audit-level=high
```

Integrar no CI (GitHub Actions):

```yaml
# .github/workflows/security.yml
- name: Audit dependencies
  run: npm audit --audit-level=high --omit=dev
```

---

## Lockfiles

```bash
# Sempre commitar o lockfile
git add package-lock.json
git commit -m "chore: update package-lock.json"

# Verificar integridade do lockfile
npm ci  # usa EXCLUSIVAMENTE o lockfile, nao resolve versoes novas

# Nunca usar npm install em CI — usar npm ci
# npm install pode atualizar o lockfile silenciosamente
```

Regra: `package-lock.json` nunca deve estar no `.gitignore`.

---

## Pinning de dependencias em producao

Diferenciar entre dependencias de desenvolvimento e producao:

```json
// package.json — producao: versao exata, dev: range permitido
{
  "dependencies": {
    "@supabase/supabase-js": "2.49.4",
    "hono": "4.7.5"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "wrangler": "^3.109.0",
    "vitest": "^3.1.2"
  }
}
```

```bash
# Instalar dependencia de producao com versao exata
npm install --save-exact @supabase/supabase-js@2.49.4

# Verificar o que esta desatualizado
npm outdated
```

---

## Typosquatting defense

Verificar antes de instalar qualquer nova dependencia:

```bash
# 1. Confirmar nome exato no npmjs.com
# https://www.npmjs.com/package/<nome>

# 2. Verificar downloads semanais (pacotes legitimos tem volume alto)
curl https://api.npmjs.org/downloads/point/last-week/<nome>

# 3. Verificar data de criacao (novos pacotes com nomes similares sao suspeitos)
npm info <nome> time.created

# 4. Antes de instalar, checar repositorio GitHub vinculado
npm info <nome> repository
```

Exemplos de typosquatting historico a evitar:

- `lodash` vs `lodahs`, `1odash`
- `express` vs `expres`, `expresss`
- `colors` vs `co1ors`

```bash
# Ferramenta: socket.dev CLI (2026)
npx socket npm install <nome>
# Analisa reputacao, permissoes e comportamento antes de instalar
```

---

## SBOM — Software Bill of Materials

SBOM completo documentado em `10-sbom.md`. Resumo:

```bash
# Gerar SBOM em formato CycloneDX (padrao 2026)
npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file sbom.json

# Alternativa: cdxgen
npx cdxgen -t npm -o sbom.json
```

O SBOM deve ser gerado:
- A cada release
- Quando houver mudanca em `package.json`
- Como artefato de CI/CD

---

## Verificacao de integridade de scripts

```bash
# Verificar se scripts npm sao seguros antes de rodar
cat package.json | jq '.scripts'

# Inspecionar scripts de pre/post install de dependencias (risco alto)
cat node_modules/<pacote>/package.json | jq '.scripts'
```

Scripts suspeitos em dependencias: `preinstall`, `postinstall`, `install` executando `curl`, `wget`, `sh`, `bash`.

---

## Checklist

- [ ] `package-lock.json` commitado e atualizado
- [ ] `npm audit --omit=dev` sem vulnerabilidades high/critical
- [ ] CI roda `npm audit` antes de build
- [ ] Dependencias de producao com versao exata (sem `^` ou `~`)
- [ ] Novas dependencias verificadas no npmjs.com antes de instalar
- [ ] SBOM gerado na ultima release (ver `10-sbom.md`)
- [ ] `npm ci` usado no CI, nao `npm install`

---

## Anti-patterns

```bash
# ERRADO: instalar sem verificar
npm install some-new-package

# ERRADO: ignorar lockfile no .gitignore
echo "package-lock.json" >> .gitignore

# ERRADO: usar npm install no CI (pode alterar lockfile)
# CERTO: usar npm ci

# ERRADO: dependencia de producao com range aberto
# "express": "^4.0.0"  <- pode instalar versao vulneravel

# ERRADO: ignorar alertas do npm audit
npm audit fix --force  # pode quebrar a aplicacao silenciosamente
```

---

## Referencias

- [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [npm ci docs](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [OWASP — Software Component Verification Standard](https://owasp.org/www-project-software-component-verification-standard/)
- [CISA — Software Supply Chain Security](https://www.cisa.gov/resources-tools/resources/software-bill-materials-sbom)
- Skill: `trailofbits/static-analysis` — analise estatica de dependencias e codigo
