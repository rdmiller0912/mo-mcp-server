// Shared constants for mo-mcp-server

export const SERVER_NAME = 'mo-mcp-server';
export const SERVER_VERSION = '1.0.0';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MAX_BULK_INSERT = 10;

// Response size limits
export const MAX_RESPONSE_CHARS = 50000;

// Environment variable names
export const ENV = {
  PORT: 'PORT',
  TRANSPORT: 'TRANSPORT',
  MCP_BEARER_TOKEN: 'MCP_BEARER_TOKEN',
  NOCODB_BASE_URL: 'NOCODB_BASE_URL',
  NOCODB_API_TOKEN: 'NOCODB_API_TOKEN',
  NOCODB_BASE_ID: 'NOCODB_BASE_ID',
  N8N_BASE_URL: 'N8N_BASE_URL',
  N8N_API_KEY: 'N8N_API_KEY',
} as const;
