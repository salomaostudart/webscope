## O que mudou
<!--
2-4 bullet points descrevendo as mudancas. Foque no "o que" e "por que",
nao no "como" (o diff ja mostra o como).
-->

- 
- 

## Tipo de mudanca
- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correcao de bug
- [ ] `docs` — documentacao
- [ ] `refactor` — reestruturacao sem mudanca de comportamento
- [ ] `chore` — manutencao / deps
- [ ] `test` — testes
- [ ] `perf` — performance
- [ ] `security` — seguranca

## Como testar
<!--
Passos para verificar que a mudanca funciona.
Seja especifico: URL, dados de entrada, resultado esperado.
-->

1. 
2. 

## Checklist antes de mergear
- [ ] `npm run ci` passa (type-check + test + build)
- [ ] Nenhum `console.log` de debug no codigo
- [ ] Nenhuma variavel hardcoded que deveria ser env var
- [ ] Nenhum secret no diff
- [ ] Se mudou UI: testado em mobile e desktop
- [ ] Se mudou analyzer: testes unitarios cobrem casos bom/ruim/vazio
- [ ] Se mudou API/Worker: validacao de inputs com Zod

## Screenshots (se mudanca visual)
<!-- Antes e depois, ou apenas o estado novo -->

## Links relacionados
<!-- Issues, tarefas, documentos de referencia -->
