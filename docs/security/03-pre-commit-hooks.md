# 03 — Pre-commit Hooks

Stack: git + Node.js + TypeScript
Skills externas: `trailofbits/static-analysis`, `trailofbits/semgrep-rule-creator`

---

## Principios

- **Fail fast:** detectar problemas antes do commit, nao apos o push.
- **Automatizar o que e repetitivo:** varredura de secrets, linting e tipos automatizados.
- **Zero false negatives em secrets:** qualquer suspeita de credencial bloqueia o commit.

---

## Instalacao

```bash
# Instalar ferramentas de pre-commit
npm install --save-dev husky lint-staged

# Inicializar husky
npx husky init

# Verificar que o hook foi criado
cat .husky/pre-commit
```

---

## gitleaks — deteccao de secrets

```bash
# Instalar gitleaks (binario, nao depende de Node)
# Windows (winget)
winget install gitleaks

# macOS
brew install gitleaks

# Linux
curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar -xz

# Rodar manualmente no repositorio
gitleaks detect --source . --verbose

# Varredura de um commit especifico
gitleaks detect --source . --log-opts="HEAD~1..HEAD"

# Varredura de todo o historico (uma vez)
gitleaks detect --source . --log-opts="--all"
```

Configurar no pre-commit (`.husky/pre-commit`):

```bash
#!/bin/sh
# .husky/pre-commit

# 1. Detectar secrets antes de qualquer commit
gitleaks protect --staged --verbose
if [ $? -ne 0 ]; then
  echo "BLOQUEADO: gitleaks detectou possivel secret. Revisar antes de commitar."
  exit 1
fi

# 2. Rodar lint-staged
npx lint-staged
```

Arquivo de configuracao (`.gitleaks.toml`):

```toml
[extend]
useDefault = true

[[rules]]
description = "CF API Token customizado"
id = "cf-api-token"
regex = '''(?i)cf[_-]api[_-]token\s*=\s*[a-zA-Z0-9_-]{40,}'''
tags = ["cloudflare", "api-token"]

[[rules]]
description = "Supabase service role key"
id = "supabase-service-role"
regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'''
tags = ["supabase", "jwt"]

[allowlist]
description = "Ignorar arquivos de exemplo e testes"
paths = [
  ".env.example",
  "docs/",
  "**/*.test.ts",
  "**/*.spec.ts"
]
```

---

## detect-secrets — alternativa Python

```bash
# Instalar (requer Python)
pip install detect-secrets

# Gerar baseline (mapeia secrets conhecidos/falsos positivos)
detect-secrets scan > .secrets.baseline

# Verificar novos secrets contra o baseline
detect-secrets scan --baseline .secrets.baseline

# Auditar o baseline interativamente
detect-secrets audit .secrets.baseline
```

Integrar no pre-commit via `pre-commit` framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## semgrep — analise estatica para CF/TS

```bash
# Instalar
pip install semgrep
# ou
npm install -g @semgrep/semgrep

# Rodar com ruleset padrao para TypeScript
semgrep --config=p/typescript .

# Rodar com ruleset de seguranca especifico
semgrep --config=p/owasp-top-ten .
semgrep --config=p/secrets .

# Rodar apenas em arquivos modificados (para pre-commit)
semgrep --config=p/typescript $(git diff --staged --name-only | grep '\.ts$')
```

Regras customizadas para Cloudflare Workers (`.semgrep/cf-workers.yaml`):

```yaml
rules:
  - id: no-console-log-secrets
    patterns:
      - pattern: console.log(..., $ENV.SUPABASE_SERVICE_ROLE_KEY, ...)
      - pattern: console.log(..., $ENV.$SECRET_KEY, ...)
    message: "Possivel log de credencial via env var"
    severity: ERROR
    languages: [typescript, javascript]

  - id: no-hardcoded-urls-with-creds
    pattern: fetch("https://...:..@...")
    message: "URL com credenciais hardcoded"
    severity: ERROR
    languages: [typescript, javascript]

  - id: no-request-cf-raw-access
    pattern: request.cf.$ANYTHING
    message: "Acessar request.cf diretamente pode expor dados de infraestrutura"
    severity: WARNING
    languages: [typescript]
```

```bash
# Rodar regras customizadas
semgrep --config=.semgrep/ .
```

---

## lint-staged — integrar tudo

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "semgrep --config=p/typescript --error",
      "eslint --fix",
      "tsc --noEmit"
    ],
    "*.{ts,tsx,js,json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## settings.json — Claude Code hooks

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "gitleaks protect --staged --no-banner 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

---

## Checklist

- [ ] `gitleaks` instalado e configurado no pre-commit
- [ ] `.gitleaks.toml` customizado com patterns do projeto
- [ ] `.husky/pre-commit` ativo e executavel (`chmod +x`)
- [ ] `semgrep` rodando em arquivos TS modificados
- [ ] `lint-staged` configurado em `package.json`
- [ ] Pre-commit hooks testados: `git commit --dry-run`
- [ ] `.secrets.baseline` commitado (se usando detect-secrets)

---

## Anti-patterns

```bash
# ERRADO: bypass de hooks sem justificativa
git commit --no-verify -m "feat: add feature"

# ERRADO: adicionar .husky/ ao .gitignore
echo ".husky/" >> .gitignore

# ERRADO: semgrep sem --error (warnings nao bloqueiam commit)
semgrep --config=p/typescript .  # sem --error

# CERTO: bypass documentado e raro (hotfix urgente)
# git commit --no-verify -m "hotfix: corrigir producao (bypass justificado)"
# Registrar ocorrencia em bugs-melhorias.md
```

---

## Referencias

- [gitleaks](https://github.com/gitleaks/gitleaks)
- [detect-secrets](https://github.com/Yelp/detect-secrets)
- [semgrep docs](https://semgrep.dev/docs/)
- [semgrep TypeScript rules](https://semgrep.dev/p/typescript)
- [husky docs](https://typicode.github.io/husky/)
- Skills: `trailofbits/static-analysis`, `trailofbits/semgrep-rule-creator`
