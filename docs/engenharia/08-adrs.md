# Architecture Decision Records (ADRs)

Registros de decisoes de arquitetura do projeto. Documentam nao apenas O QUE foi decidido, mas POR QUE — para que decisoes nao sejam revertidas sem entender o tradeoff original.

---

## Quando registrar uma ADR

Registrar sempre que:
- Escolher entre duas ou mais abordagens tecnicas
- Adotar uma biblioteca ou servico novo
- Mudar padrao de comunicacao ou fluxo de dados
- Definir estrutura de dados que afeta multiplos componentes
- Decidir sobre estrategia de autenticacao ou deploy

Nao registrar para:
- Decisoes triviais de implementacao (nome de variavel, cor de botao)
- Coisas que podem ser vistas no codigo sem contexto adicional

---

## Template para novas ADRs

Criar em `docs/engenharia/decisoes/` com nome: `ADR-NNN-nome-da-decisao.md`

```markdown
# ADR-NNN — [Titulo da Decisao]

**Data:** DD/MM/AAAA
**Status:** Aceito | Em avaliacao | Substituido por ADR-XXX

## Contexto

O que estava acontecendo que exigiu esta decisao?
Qual problema estava sendo resolvido?

## Opcoes consideradas

### Opcao A — [Nome]
**Pros:** ...
**Contras:** ...

### Opcao B — [Nome]
**Pros:** ...
**Contras:** ...

## Decisao

Qual opcao foi escolhida e por que.

## Consequencias

O que muda com esta decisao? Quais tradeoffs foram aceitos?
O que fica mais facil? O que fica mais dificil?
```

---

## ADRs do WebScope

- [ADR-001 — Astro como framework](decisoes/ADR-001-astro-framework.md)
- [ADR-002 — Cloudflare Workers como proxy](decisoes/ADR-002-cf-worker-proxy.md)
- [ADR-003 — Analyzer Pattern](decisoes/ADR-003-analyzer-pattern.md)
- [ADR-004 — Cloudflare-only stack](decisoes/ADR-004-cloudflare-only.md)
