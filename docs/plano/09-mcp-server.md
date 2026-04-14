# WebScope — MCP Server

## Visao geral

MCP (Model Context Protocol) server que permite AI agents (Claude Code, etc) consultarem e executarem auditorias programaticamente. Mesmo padrao do growth-dashboard (13 tools), mas focado em auditoria de sites.

## Tools

### Read Tools (6)

#### `run_audit`
Executa auditoria completa em uma URL.
- **Input:** `{ url: string, strategy?: 'mobile' | 'desktop' }`
- **Output:** Score geral, scores por categoria, top 5 findings criticos, AI summary
- **Nota:** essa tool e lenta (10-30s por causa do Lighthouse). Avisar no description.

#### `get_audit`
Busca auditoria por ID.
- **Input:** `{ audit_id: string }`
- **Output:** Auditoria completa com todos os findings

#### `get_findings`
Busca findings filtrados.
- **Input:** `{ audit_id: string, analyzer?: string, severity?: string }`
- **Output:** Lista de findings filtrados

#### `get_score`
Score resumido de uma auditoria.
- **Input:** `{ audit_id: string }`
- **Output:** Score geral + scores por categoria + grade

#### `compare_audits`
Compara 2 auditorias (mesma URL, datas diferentes).
- **Input:** `{ audit_id_1: string, audit_id_2: string }`
- **Output:** Delta de scores, findings novos, findings resolvidos

#### `list_audits`
Lista auditorias de um dominio.
- **Input:** `{ domain?: string, limit?: number }`
- **Output:** Lista de auditorias com score e data

### Write Tools (2)

#### `generate_report`
Gera relatorio em Markdown.
- **Input:** `{ audit_id: string, format?: 'markdown' | 'csv' }`
- **Output:** Relatorio completo em texto

#### `suggest_fixes`
Gera sugestoes de correcao priorizadas via IA.
- **Input:** `{ audit_id: string, max_suggestions?: number }`
- **Output:** Lista de sugestoes com impacto e esforco estimado

## Implementacao

```typescript
// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'webscope',
  version: '1.0.0',
});

// Tools registration
server.tool('run_audit', {
  description: 'Run a full website audit on a URL. Takes 10-30 seconds due to Lighthouse analysis.',
  inputSchema: z.object({
    url: z.string().url(),
    strategy: z.enum(['mobile', 'desktop']).optional().default('mobile'),
  }),
  handler: async ({ url, strategy }) => {
    // 1. Fetch URL via Worker
    // 2. Fetch Lighthouse via PSI API
    // 3. Run all 6 analyzers
    // 4. Return summary
  },
});

// ... demais tools

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

## Config (.mcp.json)

```json
{
  "mcpServers": {
    "webscope": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "."
    }
  }
}
```

## Uso

```bash
# No Claude Code, dentro do projeto WebScope:
# As tools ficam disponiveis automaticamente via .mcp.json

# Exemplos de uso via Claude Code:
# "Audite o site growth.sal.dev.br"
# "Quais sao os findings criticos da ultima auditoria?"
# "Compare a auditoria de hoje com a de ontem"
# "Gere um relatorio da auditoria X"
```
