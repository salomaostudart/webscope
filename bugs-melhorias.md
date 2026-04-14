# WebScope — Bugs e Melhorias

## Pendentes

### Seguranca (LOW — nao bloqueantes)
- B014: Token de acesso deterministic (sem salt/nonce por sessao) — cookie igual para todos os usuarios
- B015: Markdown injection possivel no body de GitHub Issues via feedback
- B016: Audit ID e Screenshot ID nao validados por formato antes de query D1/KV
- B019: parseInt(limit) pode produzir NaN no GET /audits

### Funcional
- B020: AI Summary/Quick Wins nao aparece (Workers AI pode nao estar respondendo — verificar dashboard CF > Workers AI > Usage)
- B021: Performance Score = 0/100 em testes (PSI API timeout/quota — verificar manualmente)

## Resolvidos (14/04/2026 — PR #30)

- B001: [CRITICO] Auth bypass — token validado apenas por comprimento (64 chars). Fix: SHA-256 + timing-safe comparison
- B002: [CRITICO] XSS via innerHTML — dados externos (titulos, meta, headers) inseridos sem escaping em 9 arquivos. Fix: escapeHtml() aplicado em todos os innerHTML
- B003: [CRITICO] Stored XSS via D1 — findings persistidos sem sanitizacao. Fix: resolvido pelo escapeHtml no render
- B004: [ALTO] SSRF gaps — faltavam ranges CGNAT, benchmarking, IPv4-mapped IPv6, decimal IP. Fix: ranges adicionados
- B005: [ALTO] CORS localhost em producao. Fix: localhost so em dev mode
- B006: [ALTO] XSS no FeedbackButton (issueUrl via innerHTML). Fix: createElement + validacao github.com
- B008: [MEDIO] CSP com Supabase connect-src e sem object-src. Fix: limpo e adicionado
- B009: [MEDIO] Screenshot MIME nao validado (podia servir HTML). Fix: validado como image/*
- B011: [MEDIO] POST /audits sem rate limiting. Fix: 10/hora por IP + truncamento de campos
- B012: [MEDIO] AI prompt injection via findings. Fix: truncamento + newline strip + system prompt hardened
- QA01: Pagina /history faltando (dead link). Fix: criada
- QA02: Dead code (gradeColor, scoreToGrade import, middleware handler). Fix: removido
- QA03: aria-expanded e aria-current faltando. Fix: adicionados
- QA04: 6 `as any` por falta de window.d.ts. Fix: criado
- QA05: Catch blocks silenciosos sem logging. Fix: console.error em DEV
