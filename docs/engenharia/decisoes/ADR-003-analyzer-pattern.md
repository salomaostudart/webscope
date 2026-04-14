# ADR-003 — Analyzer Pattern para modulos de analise

**Data:** 14/04/2026
**Status:** Aceito

## Contexto

WebScope precisa de 6 modulos de analise independentes (Performance, SEO, Accessibility, Content, Branding, Security). Cada um recebe os mesmos dados (URL + HTML + headers + Lighthouse) e retorna score + findings. Precisa de uma arquitetura que permita adicionar novos analyzers sem modificar codigo existente.

## Opcoes consideradas

### Opcao A — Funcoes soltas
**Pros:** simples, sem abstraao
**Contras:** sem contrato, cada funcao pode retornar formato diferente, dificil de adicionar novo analyzer, sem registry central

### Opcao B — Analyzer Pattern (interface + registry)
**Pros:** contrato tipado (IAnalyzer<T>), registry central, execucao paralela, cada analyzer e independente e testavel, adicionar novo = implementar interface + registrar
**Contras:** mais codigo inicial (interface, registry, base classes)

### Opcao C — Plugin system dinamico
**Pros:** analyzers como plugins carregaveis em runtime, maximo de extensibilidade
**Contras:** over-engineering para 6 analyzers conhecidos, complexidade de loading, dificil de tipar

## Decisao

Analyzer Pattern (Opcao B). Evolucao do Connector Pattern do growth-dashboard.

**Por que:**
1. **Contrato tipado** — `IAnalyzer<T>` garante que todo analyzer retorna `AnalyzerResult<T>` com score, grade, findings e dados tipados
2. **Independencia** — cada analyzer e um modulo isolado em sua pasta, testavel com dados mock, sem depender de outro
3. **Registry** — `registry.ts` registra e executa todos os analyzers em paralelo via `Promise.all`. Score geral e calculado com pesos
4. **Extensibilidade pratica** — adicionar analyzer novo: criar pasta, implementar interface, registrar. 7 passos documentados em `docs/plano/02-analyzers.md`
5. **Mesma linguagem** — quem conhece o Connector Pattern do growth-dashboard entende o Analyzer Pattern imediatamente

## Consequencias

- Interface `IAnalyzer<T>` e o contrato central — mudancas nela afetam todos os analyzers
- Cada analyzer tem dados tipados (`PerformanceData`, `SEOData`, etc.) — tipagem forte
- Pesos dos analyzers no score geral somam 100 — adicionar novo requer redistribuir pesos
- Findings seguem formato padrao (`Finding`) com severity, impact, effort — permite ordenacao e filtragem global
- Radar chart e score cards dependem do registry — novo analyzer aparece automaticamente
