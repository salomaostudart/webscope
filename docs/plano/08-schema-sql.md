# WebScope — Schema SQL (Supabase)

## Tabelas

Usar o mesmo projeto Supabase do growth-dashboard (ohsczjuoqaanggupbxba). As tabelas do WebScope sao independentes — prefixo `ws_` pra evitar conflito.

### ws_audits

Armazena cada auditoria realizada.

```sql
CREATE TABLE public.ws_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'F')),
  scores JSONB NOT NULL,
  -- scores: {"performance": 85, "seo": 72, "accessibility": 78, "content": 71, "branding": 68, "security": 55}
  metadata JSONB,
  -- metadata: {"title": "...", "statusCode": 200, "responseTime": 1200, "pageSize": 524288}
  ai_summary TEXT,
  -- ai_summary: "Your site performs well in performance but needs significant improvements in SEO..."
  quick_wins JSONB,
  -- quick_wins: [{"title": "Add meta description", "impact": "high", "effort": "quick-fix", "category": "seo"}]
  lighthouse_strategy TEXT DEFAULT 'mobile' CHECK (lighthouse_strategy IN ('mobile', 'desktop')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ws_audits_user ON public.ws_audits(user_id);
CREATE INDEX idx_ws_audits_domain ON public.ws_audits(domain);
CREATE INDEX idx_ws_audits_created ON public.ws_audits(created_at DESC);
CREATE INDEX idx_ws_audits_domain_created ON public.ws_audits(domain, created_at DESC);
```

### ws_findings

Armazena cada finding de cada auditoria. Denormalizado pra queries rapidas.

```sql
CREATE TABLE public.ws_findings (
  id SERIAL PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.ws_audits(id) ON DELETE CASCADE,
  analyzer TEXT NOT NULL CHECK (analyzer IN ('performance', 'seo', 'accessibility', 'content', 'branding', 'security')),
  finding_id TEXT NOT NULL,
  -- finding_id: "seo-missing-meta-description", "perf-lcp-slow", etc
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'pass')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT CHECK (effort IN ('quick-fix', 'moderate', 'complex')),
  element TEXT,
  -- element: seletor CSS do elemento afetado (opcional)
  current_value TEXT,
  -- current_value: valor atual encontrado (opcional)
  expected_value TEXT,
  -- expected_value: valor esperado/recomendado (opcional)
  learn_more_url TEXT
);

-- Indexes
CREATE INDEX idx_ws_findings_audit ON public.ws_findings(audit_id);
CREATE INDEX idx_ws_findings_severity ON public.ws_findings(severity);
CREATE INDEX idx_ws_findings_analyzer ON public.ws_findings(analyzer);
CREATE INDEX idx_ws_findings_audit_analyzer ON public.ws_findings(audit_id, analyzer);
```

## Row Level Security

```sql
-- Enable RLS
ALTER TABLE public.ws_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ws_findings ENABLE ROW LEVEL SECURITY;

-- ws_audits policies

-- Qualquer pessoa pode criar auditoria (tool publica)
-- user_id e null se nao logado
CREATE POLICY "Anyone can create audits"
  ON public.ws_audits FOR INSERT
  WITH CHECK (true);

-- Auditorias sem user_id sao publicas (qualquer um pode ver)
CREATE POLICY "Anon read audits without user"
  ON public.ws_audits FOR SELECT
  USING (user_id IS NULL);

-- Usuarios logados veem suas proprias auditorias
CREATE POLICY "Auth users read own audits"
  ON public.ws_audits FOR SELECT
  USING (user_id = auth.uid());

-- ws_findings policies

-- Findings sao acessiveis se a auditoria e acessivel
CREATE POLICY "Anyone can read findings of accessible audits"
  ON public.ws_findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ws_audits
      WHERE id = ws_findings.audit_id
      AND (user_id IS NULL OR user_id = auth.uid())
    )
  );

-- Sistema insere findings (via service role ou anon)
CREATE POLICY "Anyone can insert findings"
  ON public.ws_findings FOR INSERT
  WITH CHECK (true);
```

## Queries comuns

### Buscar auditoria por ID

```sql
SELECT a.*, array_agg(f.*) as findings
FROM public.ws_audits a
LEFT JOIN public.ws_findings f ON f.audit_id = a.id
WHERE a.id = $1
GROUP BY a.id;
```

### Historico de um dominio (usuario logado)

```sql
SELECT id, url, overall_score, overall_grade, created_at
FROM public.ws_audits
WHERE user_id = auth.uid()
AND domain = $1
ORDER BY created_at DESC
LIMIT 20;
```

### Trend de score ao longo do tempo

```sql
SELECT
  date_trunc('day', created_at) as day,
  avg(overall_score)::integer as avg_score,
  count(*) as audits
FROM public.ws_audits
WHERE domain = $1
AND user_id = auth.uid()
AND created_at > now() - interval '90 days'
GROUP BY day
ORDER BY day;
```

### Findings mais comuns (todos os usuarios)

```sql
SELECT
  finding_id,
  title,
  severity,
  analyzer,
  count(*) as occurrences
FROM public.ws_findings
GROUP BY finding_id, title, severity, analyzer
ORDER BY occurrences DESC
LIMIT 20;
```

## Migracoes

Nao usar ferramenta de migration pra v1. Executar SQL diretamente no Supabase SQL Editor.

Se necessario no futuro, criar pasta `supabase/migrations/` com arquivos numerados:
```
supabase/migrations/
  001_create_ws_audits.sql
  002_create_ws_findings.sql
  003_add_ai_columns.sql
```
