# 09 — Incident Response

Stack: qualquer componente do projeto
Referencias: NIST SP 800-61r2, `openai/security-threat-model`
Skill externa: `openai/security-threat-model`

---

## Principios

- **Preparacao antecipada:** o runbook deve existir antes do incidente.
- **Containment primeiro:** parar o sangramento antes de investigar.
- **Comunicacao clara:** stakeholders informados em linguagem nao tecnica.
- **Aprender com incidentes:** post-mortem blameless, foco em sistemas.

---

## Fases NIST SP 800-61r2

```
Preparation -> Detection -> Analysis -> Containment -> Eradication -> Recovery -> Lessons Learned
```

---

## Fase 1: Preparation

### Equipe de resposta

| Papel | Responsabilidade |
|-------|-----------------|
| Incident Commander | Coordenar resposta, comunicar stakeholders |
| Technical Lead | Analise tecnica e containment |
| Communications | Comunicar usuarios, imprensa, reguladores |
| Legal | Avaliacao de obrigacoes legais (LGPD, GDPR) |

### Contatos de emergencia

```
# Arquivo: docs/security/contacts-emergency.md (NAO commitar — contem dados pessoais)
# Manter localmente ou em password manager

Cloudflare Support: https://support.cloudflare.com (Critical/Enterprise ticket)
Supabase Support: https://supabase.com/dashboard/support
GitHub Support: https://support.github.com
ANPD (DPAs Brazil): https://www.gov.br/anpd/pt-br/canais_atendimento
```

### Ferramentas pre-configuradas

```bash
# Verificar acesso antes de um incidente ocorrer
wrangler tail --format=pretty     # logs em tempo real
gh api repos/{owner}/{repo}/security-advisories  # listar advisories
supabase db logs --project-ref <ref>  # logs do banco

# Revogar CF API token comprometido
curl -X DELETE "https://api.cloudflare.com/client/v4/user/tokens/<TOKEN_ID>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Revogar GitHub token
gh auth token  # identificar token atual
# Revogar em: github.com/settings/tokens
```

---

## Fase 2: Detection

### Sinais de alerta

```
Alta prioridade (resposta imediata):
- Acesso nao autorizado a dados de usuario
- Credenciais comprometidas (detectadas por gitleaks, email de alerta)
- Comportamento anomalo em Workers (spike de erros 5xx)
- Alerta do GitHub Secret Scanning
- Notificacao de breach por terceiro

Media prioridade (resposta em 4h):
- Tentativas de autenticacao suspeitas (multiplos 401/403)
- Dependencia comprometida (npm advisory)
- PR com codigo suspeito aprovado
```

### Classificacao de severidade

| Nivel | Definicao | SLA de resposta |
|-------|-----------|-----------------|
| P0 — Critical | Dados expostos, sistema comprometido | 30 minutos |
| P1 — High | Credencial exposta, acesso nao autorizado suspeito | 2 horas |
| P2 — Medium | Vulnerabilidade confirmada sem exploracao | 24 horas |
| P3 — Low | Vulnerabilidade potencial, sem evidencia | 72 horas |

---

## Fase 3: Analysis

### Coleta de evidencias

```bash
# 1. Capturar logs ANTES de qualquer acao de containment
wrangler tail --format=json > incident-$(date +%Y%m%d-%H%M).log

# 2. Identificar escopo: quais recursos foram afetados?
# Checar CF Access logs: Zero Trust -> Logs -> Access
# Checar Supabase logs: Dashboard -> Logs Explorer
# Checar GitHub audit log: Organization -> Settings -> Audit log

# 3. Identificar janela de tempo: quando comecou?
# Usar requestId dos logs para rastrear sessao especifica

# 4. Identificar vetor de ataque
# Secret comprometido? -> verificar gitleaks history
# Dependencia vulneravel? -> npm audit
# Endpoint exposto? -> checar WAF logs no Cloudflare
```

```bash
# Verificar commits recentes para secrets acidentais
gitleaks detect --source . --log-opts="--since=7.days.ago" --verbose

# Verificar se secret foi commitado em qualquer branch
gitleaks detect --source . --log-opts="--all" --verbose
```

---

## Fase 4: Containment

### Containment imediato (P0/P1)

```bash
# 1. REVOGAR credencial comprometida imediatamente
# CF API Token
curl -X DELETE "https://api.cloudflare.com/client/v4/user/tokens/<ID>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Supabase: revogar service role (requer novo token)
# Dashboard -> Settings -> API -> Regenerate service_role key

# GitHub PAT: github.com/settings/tokens -> Revoke

# 2. Bloquear IP suspeito no Cloudflare WAF
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/firewall/rules" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "filter": { "expression": "ip.src eq <IP_SUSPEITO>" },
    "action": "block",
    "description": "Incident containment - <INCIDENT_ID>"
  }'

# 3. Revogar sessoes Supabase de usuario comprometido
# Via Supabase Admin API
curl -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/admin/users/<USER_ID>/logout" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

---

## Fase 5: Eradication

```bash
# 1. Remover secret do historico git (se commitado)
# AVISO: git filter-repo reseta working tree
# Commitar tudo + backup antes de rodar
git filter-repo --path <arquivo-com-secret> --invert-paths

# 2. Rotacionar TODAS as credenciais potencialmente expostas
# Nao apenas a comprometida — seguir principio de blast radius

# 3. Verificar que o vetor de ataque foi eliminado
gitleaks detect --source . --log-opts="--all"  # deve retornar limpo

# 4. Atualizar dependencias vulneraveis
npm audit fix
```

---

## Fase 6: Recovery

```bash
# 1. Configurar novas credenciais com least-privilege
wrangler secret put <SECRET_NAME>

# 2. Verificar que o sistema funciona normalmente
wrangler tail --format=pretty  # monitorar por 30min apos recovery

# 3. Remover restricoes temporarias de containment (ex: block de IP)
# Apenas apos confirmacao de que o vetor foi eliminado

# 4. Comunicar usuarios afetados (se aplicavel)
# Prazo LGPD: notificar ANPD em 72h apos ciencia do incidente
# Prazo GDPR: notificar DPA em 72h
```

---

## Fase 7: Lessons Learned — Post-mortem

Template de post-mortem (criar em `docs/post-mortems/YYYY-MM-DD-<titulo>.md`):

```markdown
# Post-mortem: <titulo>

**Data do incidente:** YYYY-MM-DD HH:MM BRT
**Data do post-mortem:** YYYY-MM-DD
**Severidade:** P0/P1/P2/P3
**Duracao:** X horas Y minutos
**Servicos afetados:** [listar]
**Usuarios impactados:** estimativa

## Timeline

| Hora (BRT) | Evento |
|------------|--------|
| HH:MM | Incidente detectado |
| HH:MM | Incident Commander acionado |
| HH:MM | Containment iniciado |
| HH:MM | Root cause identificado |
| HH:MM | Eradicacao concluida |
| HH:MM | Recovery confirmado |

## Root cause

[Descricao tecnica do que causou o incidente]

## Impacto

[O que foi afetado, quantos usuarios, dados expostos ou nao]

## O que funcionou bem

- [Item 1]
- [Item 2]

## O que pode melhorar

- [Item 1]
- [Item 2]

## Acoes corretivas

| Acao | Owner | Prazo |
|------|-------|-------|
| [acao] | [nome] | YYYY-MM-DD |
```

---

## Plano de comunicacao

### Comunicacao interna

```
Deteccao -> Slack #incidents (ou canal equivalente) imediatamente
P0/P1: ligar para Incident Commander
Update a cada 30 minutos ate resolucao
```

### Comunicacao com usuarios

```
Se dados de usuario foram expostos:
- Email dentro de 48h (LGPD exige comunicacao "em prazo razoavel")
- Descrever: o que aconteceu, quais dados, acoes tomadas, o que o usuario deve fazer
- Nao minimizar, nao especular sobre dados nao confirmados
```

### Comunicacao regulatoria (LGPD/GDPR)

```bash
# LGPD: notificar ANPD em 72h
# https://www.gov.br/anpd/pt-br/canais_atendimento/peticoes-e-denuncias

# GDPR: notificar DPA local em 72h
# Lista de DPAs: https://edpb.europa.eu/about-edpb/about-edpb/members_en
```

---

## Checklist

- [ ] Runbook revisado (pelo menos 1x por trimestre)
- [ ] Contatos de emergencia atualizados
- [ ] Acesso a ferramentas de containment testado
- [ ] wrangler tail funcionando
- [ ] Supabase admin API token disponivel
- [ ] Processo de revogacao de CF tokens documentado
- [ ] Template de post-mortem preparado

---

## Referencias

- [NIST SP 800-61r2 — Computer Security Incident Handling Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
- [Cloudflare Incident Response](https://developers.cloudflare.com/fundamentals/security/)
- [ANPD — notificacao de incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento)
- [SANS Incident Response Playbooks](https://www.sans.org/reading-room/whitepapers/incident/)
- Skill: `openai/security-threat-model` — threat modeling STRIDE para identificar vetores
