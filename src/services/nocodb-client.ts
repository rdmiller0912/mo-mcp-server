// NocoDB API client for mo-mcp-server
// Wraps the NocoDB v2 REST API with typed methods

import { ENV } from '../constants.js';
import type { NocoDBTable, NocoDBField, NocoDBRecord, NocoDBListResponse } from '../types.js';

function getConfig() {
  const baseUrl = process.env[ENV.NOCODB_BASE_URL];
  const token = process.env[ENV.NOCODB_API_TOKEN];
  const baseId = process.env[ENV.NOCODB_BASE_ID];

  if (!baseUrl || !token || !baseId) {
    throw new Error(
      'Missing NocoDB configuration. Required env vars: ' +
      'NOCODB_BASE_URL, NOCODB_API_TOKEN, NOCODB_BASE_ID'
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), token, baseId };
}

function headers(): Record<string, string> {
  const { token } = getConfig();
  return {
    'xc-token': token,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;

  const opts: RequestInit = {
    method,
    headers: headers(),
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    const status = res.status;

    if (status === 404) {
      throw new Error(
        `NocoDB resource not found (404). Verify the table ID is correct. ` +
        `NocoDB v2 API requires table IDs (like "mhxtlsrn2rx5nqo"), not table names. ` +
        `Use nocodb_list_tables to find the correct ID. Details: ${errorText}`
      );
    }
    if (status === 401 || status === 403) {
      throw new Error(
        `NocoDB authentication failed (${status}). The API token may be invalid or expired. ` +
        `Contact Rob to rotate the NOCODB_API_TOKEN. Details: ${errorText}`
      );
    }
    if (status === 429) {
      throw new Error(
        `NocoDB rate limit exceeded (429). Wait 60 seconds and retry. ` +
        `If this persists, reduce the page size or add delays between requests.`
      );
    }
    if (status === 502 || status === 503) {
      throw new Error(
        `NocoDB server error (${status}). The service may be temporarily unavailable. ` +
        `For bulk operations, try smaller batches (max 10 records). Details: ${errorText}`
      );
    }

    throw new Error(`NocoDB API error ${status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

// --- Public API Methods ---

export async function listTables(): Promise<NocoDBTable[]> {
  const { baseId } = getConfig();
  const data = await apiRequest<{ list: NocoDBTable[] }>(
    `/api/v2/meta/bases/${baseId}/tables`
  );
  return data.list || [];
}

export async function getTableSchema(tableId: string): Promise<NocoDBField[]> {
  const data = await apiRequest<{ columns: NocoDBField[] }>(
    `/api/v2/meta/tables/${tableId}`
  );
  return data.columns || [];
}

export async function listRecords(
  tableId: string,
  options: {
    limit?: number;
    offset?: number;
    where?: string;
    sort?: string;
    fields?: string;
  } = {}
): Promise<NocoDBListResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.where) params.set('where', options.where);
  if (options.sort) params.set('sort', options.sort);
  if (options.fields) params.set('fields', options.fields);

  const query = params.toString();
  const path = `/api/v2/tables/${tableId}/records${query ? '?' + query : ''}`;

  return apiRequest<NocoDBListResponse>(path);
}

export async fun
