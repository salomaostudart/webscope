-- WebScope D1 Schema (SQLite)

CREATE TABLE IF NOT EXISTS ws_audits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'F')),
  scores TEXT NOT NULL,
  metadata TEXT,
  ai_summary TEXT,
  quick_wins TEXT,
  lighthouse_strategy TEXT DEFAULT 'mobile' CHECK (lighthouse_strategy IN ('mobile', 'desktop')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ws_audits_domain ON ws_audits(domain);
CREATE INDEX IF NOT EXISTS idx_ws_audits_created ON ws_audits(created_at);

CREATE TABLE IF NOT EXISTS ws_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id TEXT NOT NULL REFERENCES ws_audits(id) ON DELETE CASCADE,
  analyzer TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'pass')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT CHECK (effort IN ('quick-fix', 'moderate', 'complex')),
  current_value TEXT,
  expected_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_ws_findings_audit ON ws_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_ws_findings_severity ON ws_findings(severity);
