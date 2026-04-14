# Situacoes Comuns de Git — Como Resolver

Cenarios praticos que acontecem durante o desenvolvimento e como lidar corretamente.

---

## Commit acidental direto na main

```bash
# Reverter o commit mantendo as mudancas locais
git reset HEAD~1 --soft

# Criar branch correta e continuar
git checkout -b feature/nome-correto
git add .
git commit -m "feat: ..."
git push origin feature/nome-correto
```

Se ja fez push na main:
```bash
# Criar branch com o commit
git checkout -b feature/nome-correto

# Voltar main para o estado anterior
git checkout main
git reset --hard HEAD~1
git push --force-with-lease origin main

# Continuar na feature branch
git checkout feature/nome-correto
git push origin feature/nome-correto
```

> **force-with-lease** e mais seguro que `--force` — recusa se alguem mais fez push desde seu ultimo fetch.

---

## Branch ficou desatualizada durante desenvolvimento longo

```bash
git fetch origin
git rebase origin/main

# Se houver conflitos:
# 1. Resolver os conflitos manualmente nos arquivos indicados
# 2. git add <arquivo-resolvido>
# 3. git rebase --continue
# 4. Repetir ate finalizar

# Se o rebase ficou muito confuso e quer recomecar:
# git rebase --abort
```

**Por que rebase e nao merge?** Rebase mantem historico linear — nao cria commits de merge. O squash merge no PR vai condensar tudo em 1 commit na main de qualquer forma.

---

## Precisa de codigo de outra branch ainda nao mergeada

```bash
# Opcao 1: cherry-pick de commits especificos
git cherry-pick <hash-do-commit>

# Opcao 2: criar branch a partir da outra (cuidado — cria dependencia)
git checkout -b feature/minha-feature feature/outra-feature
```

**Cuidado com opcao 2:** se a outra branch mudar antes do merge, voce herda os problemas. Preferir cherry-pick de commits especificos.

---

## Hotfix em producao

Quando ha bug critico em producao que nao pode esperar:

```bash
# Partir de main (que E producao)
git checkout main
git pull origin main
git checkout -b fix/nome-do-bug-critico

# Corrigir, testar, commitar
npm run test
git add .
git commit -m "fix: corrigir bug critico que causava X"

# Push e abrir PR
git push origin fix/nome-do-bug-critico
```

Mesmo em hotfix, abrir PR. Pode mergear imediatamente apos self-review — mas o registro do PR documenta o que foi corrigido e por que.

---

## Desfazer ultimo commit (sem perder mudancas)

```bash
# Mantém as mudancas staged (prontas pra commit)
git reset --soft HEAD~1

# Mantém as mudancas mas nao staged
git reset --mixed HEAD~1

# Descarta as mudancas completamente (PERIGOSO)
git reset --hard HEAD~1
```

---

## Verificar se ha secrets antes de commitar

```bash
# Ver o que vai ser commitado
git diff --staged --name-only

# Verificar se ha arquivos sensiveis
git diff --staged --name-only | grep -iE "\.env|secret|password|credential|\.key"

# Se gitleaks instalado:
gitleaks protect --staged
```

---

## Limpar branches locais ja mergeadas

```bash
# Atualizar referencias remotas
git fetch --prune

# Listar branches locais ja mergeadas na main
git branch --merged main | grep -v "main"

# Deletar todas de uma vez
git branch --merged main | grep -v "main" | xargs git branch -d
```

---

## Arquivo adicionado ao staging por acidente

```bash
# Remover do staging sem deletar o arquivo
git reset HEAD <arquivo>

# Remover do staging e descartar mudancas (PERIGOSO)
git checkout -- <arquivo>
```

---

## Tamanho ideal de PR

| Tamanho | Linhas alteradas | Avaliacao |
|---------|-----------------|-----------|
| Otimo | < 200 linhas | Facil de revisar, rapido de mergear |
| Aceitavel | 200-400 linhas | Razoavel para features completas |
| Grande | 400-700 linhas | Considere quebrar em PRs menores |
| Problematico | > 700 linhas | Quebrar obrigatoriamente |

**Como quebrar PRs grandes no WebScope:**
- PR 1: interface do analyzer + schema Zod
- PR 2: implementacao do analyzer + testes unitarios
- PR 3: pagina de UI (drill-down)
- PR 4: integracao no relatorio geral + radar chart
