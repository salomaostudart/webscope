# Anti-Patterns de Testes — O que Evitar

Complemento ao `03-qa-testes.md`. Foca em padroes ruins que produzem testes frageis, falsos positivos, ou testes que nao testam nada util.

---

## Padrao correto: AAA (Arrange-Act-Assert)

Todo teste deve seguir esta estrutura:

```typescript
it('deve calcular score ponderado corretamente', () => {
  // ARRANGE — preparar dados e contexto
  const results = [
    { analyzer: 'performance', score: 90 },
    { analyzer: 'seo', score: 70 },
  ];

  // ACT — executar a funcao sendo testada
  const overall = calculateOverallScore(results);

  // ASSERT — verificar o resultado
  expect(overall).toBe(78);
});
```

**Por que AAA?** Torna o teste legivel como especificacao. Quem lê sabe: dado X, quando Y, entao Z.

---

## Anti-patterns comuns

### 1. Teste que nao testa nada

```typescript
// RUIM — sempre passa, nao verifica comportamento
it('should work', () => {
  expect(true).toBe(true);
});

// RUIM — verifica que a funcao existe, nao que funciona
it('should have scoreToGrade function', () => {
  expect(typeof scoreToGrade).toBe('function');
});
```

**Fix:** testar o RESULTADO da funcao, nao a existencia.

### 2. Multiplos asserts sem contexto

```typescript
// RUIM — se o segundo assert falha, o erro nao diz qual cenario falhou
it('formata scores corretamente', () => {
  expect(scoreToGrade(95)).toBe('A');
  expect(scoreToGrade(85)).toBe('B');
  expect(scoreToGrade(75)).toBe('C');
  expect(scoreToGrade(60)).toBe('D');
  expect(scoreToGrade(40)).toBe('F');
});
```

```typescript
// BOM — cada cenario isolado com nome descritivo
it('should return A for score 90-100', () => {
  expect(scoreToGrade(95)).toBe('A');
});

it('should return B for score 80-89', () => {
  expect(scoreToGrade(85)).toBe('B');
});
```

**Excecao:** multiplos asserts sobre o MESMO resultado sao ok:
```typescript
it('should return complete audit result', () => {
  const result = runAudit(input);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(result.findings).toBeDefined();
  expect(result.grade).toMatch(/^[A-F]$/);
});
```

### 3. Testar implementacao em vez de comportamento

```typescript
// RUIM — testa COMO a funcao faz, nao O QUE faz
it('should call Math.round', () => {
  const spy = vi.spyOn(Math, 'round');
  scoreToGrade(85.7);
  expect(spy).toHaveBeenCalled(); // fragil — se mudar implementacao, quebra
});

// BOM — testa o resultado
it('should handle decimal scores', () => {
  expect(scoreToGrade(85.7)).toBe('B');
});
```

### 4. Teste dependente de estado externo

```typescript
// RUIM — depende de horario, rede, filesystem
it('should fetch lighthouse data', async () => {
  const result = await fetchLighthouse('https://example.com'); // rede real!
  expect(result.score).toBeDefined();
});

// BOM — usar mock
it('should parse lighthouse response correctly', () => {
  const mockResponse = loadMock('lighthouse-good.json');
  const result = parseLighthouseResponse(mockResponse);
  expect(result.score).toBe(95);
});
```

### 5. Teste que ignora edge cases

```typescript
// INCOMPLETO — so testa o caminho feliz
describe('extractTitle', () => {
  it('extracts title from valid HTML', () => {
    expect(extractTitle('<title>Test</title>')).toBe('Test');
  });
});

// COMPLETO — testa caminho feliz + edge cases
describe('extractTitle', () => {
  it('extracts title from valid HTML', () => {
    expect(extractTitle('<title>Test</title>')).toBe('Test');
  });

  it('returns null when no title tag', () => {
    expect(extractTitle('<html><body></body></html>')).toBeNull();
  });

  it('returns empty string for empty title tag', () => {
    expect(extractTitle('<title></title>')).toBe('');
  });

  it('handles unclosed title tag without throwing', () => {
    expect(() => extractTitle('<title>Unclosed')).not.toThrow();
  });

  it('trims whitespace from title', () => {
    expect(extractTitle('<title>  Test  </title>')).toBe('Test');
  });
});
```

### 6. Mock que esconde bugs

```typescript
// RUIM — mock retorna exatamente o que o teste espera, nao valida nada
it('should return score 85', () => {
  vi.mock('./analyzer', () => ({
    analyze: () => ({ score: 85 }),
  }));
  const result = analyze(input);
  expect(result.score).toBe(85); // tautologia — o mock diz 85, o teste espera 85
});

// BOM — mock dos INPUTS, teste da LOGICA
it('should calculate score based on findings', () => {
  const input = createMockInput({ findings: 3, critical: 1 });
  const result = calculateScore(input);
  expect(result).toBeLessThan(70); // verifica logica, nao mock
});
```

---

## Regras praticas para o WebScope

1. **Cada analyzer tem 5 cenarios minimos:** site bom, site ruim, site medio, input vazio, edge case
2. **Mocks sao fixtures reais:** `lighthouse-good.json` e uma resposta real da PSI API capturada uma vez
3. **Testes de parser testam HTML malformado:** `<title>Unclosed` nao pode crashar
4. **Testes de scoring sao exatos:** score ponderado e determinista, assert com valor exato
5. **Testes de findings verificam severity:** critical > warning > info > pass
