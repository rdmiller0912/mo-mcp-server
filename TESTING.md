# mo-mcp-server Testing Guide

## Quick Verification (After Deployment)

### 1. Health Check (No Auth Required)

```bash
curl https://mcp.milleroperations.com/health
```

Expected response:
```json
{"status":"ok","server":"mo-mcp-server","version":"1.0.0","timestamp":"..."}
```

### 2. MCP Initialize Handshake

```bash
curl -X POST https://mcp.milleroperations.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    },
    "id": 1
  }'
```

Expected: JSON response with server capabilities and tool list.

### 3. List Tools

```bash
curl -X POST https://mcp.milleroperations.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

Expected: List of 12 tools (8 NocoDB + 4 n8n).

### 4. Test Auth Rejection

```bash
curl -X POST https://mcp.milleroperations.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong_token" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

Expected: 403 Forbidden.

### 5. Call a Tool (NocoDB List Tables)

```bash
curl -X POST https://mcp.milleroperations.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "nocodb_list_tables",
      "arguments": {}
    },
    "id": 3
  }'
```

Expected: JSON with list of all NocoDB tables and their IDs.

## Claude Desktop Connection Test

After adding the server to claude_desktop_config.json:

1. Restart Claude Desktop
2. Open a new conversation
3. Ask: "List all tables in NocoDB"
4. Claude should call nocodb_list_tables and return the table list
5. Follow up: "Show me the schema for the tasks table"
6. Claude should call nocodb_get_table_schema with the correct table ID

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Connection refused | Container not running | Check docker compose ps |
| 401 Unauthorized | Missing auth header | Add Authorization: Bearer header |
| 403 Forbidden | Wrong token | Check MCP_BEARER_TOKEN in .env |
| 404 on NocoDB tools | Wrong table ID | Use nocodb_list_tables to get IDs |
| 502 on bulk insert | Too many records | Limit to 10 per batch |
| Timeout | NocoDB/n8n unreachable | Check NOCODB_BASE_URL, N8N_BASE_URL |
