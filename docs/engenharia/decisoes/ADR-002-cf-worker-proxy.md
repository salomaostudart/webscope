# ADR-002 — Cloudflare Workers como proxy de fetch

**Data:** 14/04/2026
**Status:** Aceito

## Contexto

O WebScope precisa fazer fetch de URLs externas para analisar o HTML e headers. Browsers bloqueiam isso por CORS — precisa de um proxy server-side.

## Opcoes consideradas

### Opcao A — Supabase Edge Functions
**Pros:** ja usa Supabase para auth/DB, sem infra adicional
**Contras:** cold start mais lento (~1-2s), limite de 2MB por resposta, regiao unica (us-east-1 por padrao), latencia variavel

### Opcao B — Cloudflare Workers
**Pros:** edge global (300+ PoPs), cold start <5ms, 10MB limite por resposta, CF Pages usa mesma infra (dominio unificado), ja tem Wrangler configurado
**Contras:** infra separada do Supabase, rate limiting requer solucao propria (sem DB built-in)

### Opcao C — API route no Astro (SSR)
**Pros:** tudo no mesmo projeto, sem infra adicional
**Contras:** Astro em modo static nao tem SSR, mudar para SSR adiciona complexidade e servidor, perde vantagem de output estatico

## Decisao

Cloudflare Workers (Opcao B).

**Por que:**
1. **Edge global** — o proxy roda proximo ao usuario, nao num datacenter fixo. Fetch de URLs brasileiras a partir de PoP brasileiro = mais rapido
2. **Performance** — cold start <5ms vs ~1-2s de Edge Functions. Cada auditoria faz 1 request ao proxy + 1 request ao PSI (10-30s). Proxy precisa ser rapido
3. **Infra unificada** — CF Pages + CF Workers no mesmo dashboard e dominio
4. **Seguranca** — Worker isolado pode ter rate limiting, SSRF protection e CORS independentes do site principal
5. **Custo** — Workers free tier: 100K requests/dia, mais que suficiente

## Consequencias

- Worker e um projeto separado (`worker/`) com deploy independente
- Rate limiting in-memory (por isolate, nao global) — suficiente para v1, Durable Objects se precisar de mais
- CORS restrito a `webscope.sal.dev.br` + localhost (dev)
- URL do Worker exposta como env var (`PUBLIC_WORKER_URL`)
