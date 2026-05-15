// n8n API client for mo-mcp-server
// Wraps the n8n REST API with typed methods

import { ENV } from '../constants.js';
import type { N8nWorkflow, N8nExecution, N8nWebhookResponse } from '../types.js';

function getConfig() {
  const baseUrl = process.env[ENV.N8N_BASE_URL];
  const apiKey = process.env[ENV.N8N_API_KEY];

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Missing n8n configuration. Required env vars: N8N_BASE_URL, N8N_API_KEY'
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

function headers(): Record<string, string> {
  const { apiKey } = getConfig();
  return {
    'X-N8N-API-KEY': apiKey,
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
        `n8n resource not found (404). Verify the workflow ID is correct. ` +
        `Use n8n_list_workflows to find available workflows. Details: ${errorText}`
      );
    }
    if (status === 401 || status === 403) {
      throw new Error(
        `n8n authentication failed (${status}). The API key may be invalid or expired. ` +
        `Contact Rob to rotate the N8N_API_KEY. Details: ${errorText}`
      );
    }
    if (status === 429) {
      throw new Error(
        `n8n rate limit exceeded (429). Wait 60 seconds and retry.`
      );
    }

    throw new Error(`n8n API error ${status}: ${errorText}`);
  }

  // Some n8n endpoints return empty responses
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { message: text } as T;
  }
}

// --- Public API Methods ---

export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const data = await apiRequest<{ data: N8nWorkflow[] }>(
    '/api/v1/workflows'
  );
  return data.data || [];
}

export async function getWorkflow(workflowId: string): Promise<N8nWorkflow> {
  return apiRequest<N8nWorkflow>(
    `/api/v1/workflows/${workflowId}`
  );
}

export async function listExecutions(
  workflowId?: string,
  limit: number = 20,
  status?: string
): Promise<N8nExecution[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (workflowId) params.set('workflowId', workflowId);
  if (status) params.set('status', status);

  const data = await apiRequest<{ data: N8nExecution[] }>(
    `/api/v1/executions?${params.toString()}`
  );
  return data.data || [];
}

export async function getExecution(executionId: string): Promise<N8nExecution> {
  return apiRequest<N8nExecution>(
    `/api/v1/executions/${executionId}`
  );
}

export async function triggerWebhook(
  webhookPath: string,
  payload: Record<string, unknown> = {}
): Promise<N8nWebhookResponse> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}/webhook/${webhookPath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `n8n webhook trigger failed (${res.status}). ` +
      `Verify the webhook path "${webhookPath}" is correct and the workflow is active. ` +
      `Use n8n_list_workflows to check. Details: ${text}`
    );
  }

  try {
    return JSON.parse(text) as N8nWebhookResponse;
  } catch {
    return { message: text };
  }
}
