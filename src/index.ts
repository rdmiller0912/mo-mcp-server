// mo-mcp-server - Main entry point
// Miller Operations MCP Server for NocoDB and n8n
//
// Exposes NocoDB database operations and n8n workflow management as MCP tools
// over Streamable HTTP transport with bearer token authentication.

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { SERVER_NAME, SERVER_VERSION, ENV } from './constants.js';
import { registerNocoDBTools } from './tools/nocodb.js';
import { registerN8nTools } from './tools/n8n.js';

// --- Configuration ---

const PORT = parseInt(process.env[ENV.PORT] || '3001', 10);
const BEARER_TOKEN = process.env[ENV.MCP_BEARER_TOKEN];

if (!BEARER_TOKEN) {
  console.error('FATAL: MCP_BEARER_TOKEN environment variable is required.');
  console.error('Set a strong random token in the .env file.');
  process.exit(1);
}

// --- Create MCP Server ---

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// Register all tools
registerNocoDBTools(server);
registerN8nTools(server);

// --- Express App ---

const app = express();
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: SERVER_NAME,
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Bearer token authentication middleware for /mcp
function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Missing Authorization header. Include "Authorization: Bearer <token>" in your request.',
    });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({
      error: 'Invalid Authorization header format. Use "Authorization: Bearer <token>".',
    });
    return;
  }

  if (token !== BEARER_TOKEN) {
    res.status(403).json({
      error: 'Invalid bearer token. Check that your token matches the server configuration.',
    });
    return;
  }

  next();
}

// MCP endpoint with authentication
app.post('/mcp', authenticate, async (req, res) => {
  try {
    // Stateless mode: create a new transport for each request
    // This prevents request ID collisions between different clients
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close().catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error processing MCP request.',
      });
    }
  }
});

// Handle unsupported methods on /mcp
app.get('/mcp', (_req, res) => {
  res.status(405).json({
    error: 'Method not allowed. The MCP endpoint only accepts POST requests.',
  });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({
    error: 'Method not allowed. The MCP endpoint only accepts POST requests.',
  });
});

// --- Start Server ---

app.listen(PORT, '0.0.0.0', () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`MCP:    http://localhost:${PORT}/mcp`);
  console.log(`Transport: Streamable HTTP (stateless)`);
  console.log(`Auth: Bearer token required`);
});
