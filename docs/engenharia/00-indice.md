# WebScope — Plano de Engenharia

Documentacao completa de praticas de engenharia do projeto.
Cada arquivo cobre um aspecto em profundidade — nao resumido.

## Arquivos

| # | Arquivo | Conteudo |
|---|---|---|
| 01 | [git-workflow.md](01-git-workflow.md) | GitHub Flow, branches, conventional commits, PRs, squash merge |
| 02 | [seguranca-owasp.md](02-seguranca-owasp.md) | OWASP Top 10 adaptado para Astro + CF Workers + Supabase |
| 03 | [qa-testes.md](03-qa-testes.md) | Piramide de testes, cenarios por analyzer, mocks, definicao de pronto |
| 04 | [ci-cd.md](04-ci-cd.md) | GitHub Actions (quando desbloqueado), pipeline, deploy, status checks |
| 05 | [boas-praticas-dev.md](05-boas-praticas-dev.md) | Full-stack, TypeScript, Astro, CSS, acessibilidade, performance |
| 06 | [deploy-producao.md](06-deploy-producao.md) | CF Pages, CF Worker, Supabase, custom domain, rollback |

## Relacao com docs/plano/

Os docs em `docs/plano/` descrevem O QUE construir (produto, features, fases).
Os docs em `docs/engenharia/` descrevem COMO construir (praticas, workflow, qualidade).

Ambos devem ser lidos pelo Claude Code ao entrar no projeto.
