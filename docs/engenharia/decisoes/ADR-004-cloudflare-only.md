# ADR-004 — Cloudflare-only stack (eliminar Supabase)

**Data:** 14/04/2026
**Status:** Aceito

## Contexto

O plano original usava Supabase (Auth + PostgreSQL + Edge Functions) e Claude Haiku API para IA. Ambos requerem planos pagos para uso real. Pesquisa em abril 2026 revelou que o ecossistema Cloudflare oferece alternativas gratuitas e permanentes para todas essas necessidades.

## Opcoes consideradas

### Opcao A — Manter Supabase + Claude Haiku
**Pros:** Supabase e maduro, PostgreSQL robusto, Claude Haiku e o melhor para text generation
**Contras:** custo mensal (~$25 Supabase Pro + ~$1-5 Claude API), dois provedores (CF + Supabase), latencia de rede entre CF edge e Supabase (regiao fixa)

### Opcao B — Cloudflare-only (D1 + Workers AI + KV)
**Pros:** custo zero (free tier permanente), infra unificada (1 dashboard, 1 CLI), D1 binding direto com Workers (sem latencia de rede), Workers AI no edge (dados nao saem para API externa), Wrangler gerencia tudo
**Contras:** D1 e SQLite (nao PostgreSQL — sem JSON operators nativos, sem RLS), Workers AI usa modelos open-source (nao Claude), 10K neurons/dia pode limitar uso intenso de IA

## Decisao

Opcao B — Cloudflare-only.

**Por que:**
1. **Custo zero** — projeto de portfolio nao justifica custo mensal
2. **Infra unificada** — Pages + Workers + D1 + KV + AI no mesmo ecossistema
3. **Performance** — D1 binding direto com Worker elimina roundtrip de rede
4. **Seguranca** — Workers AI processa dados no edge, sem enviar para API externa
5. **Free tier permanente** — documentacao Cloudflare confirma: nao e trial, nao exige cartao
6. **Modelos suficientes** — Qwen3-30B-A3B e Llama 3.1 8B sao adequados para gerar sugestoes de auditoria

## Consequencias

- Schema SQL precisa ser SQLite em vez de PostgreSQL (sem JSONB, usar TEXT + JSON.parse)
- Sem RLS nativo — validacao de acesso no Worker (middleware)
- Workers AI tem limite de 10K neurons/dia — implementar cache agressivo (KV, 24h por URL)
- Auth via Auth.js + D1 adapter (nao Supabase Magic Link)
- Remover dependencia `@supabase/supabase-js` do package.json
