# mo-mcp-server

Miller Operations MCP Server providing NocoDB and n8n tools for Claude.

## Overview

This server exposes Miller Operations' NocoDB database and n8n workflow automation as MCP (Model Context Protocol) tools that Claude can call directly. It uses the Streamable HTTP transport with bearer token authentication.

## Tools Available

### NocoDB (8 tools)
- `nocodb_list_tables` - List all tables in the MO NocoDB base
- `nocodb_get_table_schema` - Get column definitions for a table
- `nocodb_list_records` - Query records with filters, sorting, pagination
- `nocodb_search_records` - Search records by field value
- `nocodb_get_record` - Get a single record by ID
- `nocodb_create_record` - Create a new record
- `nocodb_update_record` - Update an existing record
- `nocodb_bulk_insert` - Insert up to 10 records at once

### n8n (5 tools)
- `n8n_list_workflows` - List all workflows with status
- `n8n_get_workflow` - Get full workflow definition
- `n8n_list_executions` - List recent executions
- `n8n_get_execution` - Get execution details
- `n8n_trigger_workflow` - Trigger a webhook workflow

## Deployment

### xCloud Custom Docker (Recommended)
1. In xCloud panel: New Site > Custom Docker > Docker Compose
2. Paste the docker-compose.yml content
3. Set environment variables in the Environment section
4. Deploy

### Manual Docker
```bash
cp .env.example .env
# Edit .env with real values
docker compose build
docker compose up -d
```

## Connecting Claude

### Claude Desktop (via mcp-remote)
```json
{
  "mcpServers": {
    "mo-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote@latest",
        "https://mcp.milleroperations.com/mcp",
        "--header",
        "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

### Claude Code
```bash
claude mcp add --transport http mo-mcp https://mcp.milleroperations.com/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

## Development

```bash
npm install
cp .env.example .env
# Edit .env with real values
npm run dev
```

## Architecture

```
Express (port 3001)
  /health  - Health check (no auth)
  /mcp     - MCP endpoint (bearer token auth)
    -> McpServer (Streamable HTTP, stateless)
      -> NocoDB tools -> NocoDB API (data.milleroperations.com)
      -> n8n tools    -> n8n API (n8n.milleroperations.com)
```
