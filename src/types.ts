// Shared type definitions for mo-mcp-server

// NocoDB types
export type NocoDBField = {
  id: string;
  title: string;
  uidt: string;
  dt?: string;
  rqd?: boolean;
  pk?: boolean;
  ai?: boolean;
  meta?: Record<string, unknown>;
};

export type NocoDBTable = {
  id: string;
  title: string;
  meta?: Record<string, unknown>;
};

export type NocoDBRecord = Record<string, unknown>;

export type NocoDBListResponse = {
  list: NocoDBRecord[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
};

// n8n types
export type N8nWorkflow = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  nodes?: Array<Record<string, unknown>>;
  connections?: Record<string, unknown>;
};

export type N8nExecution = {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
  data?: Record<string, unknown>;
};

export type N8nWebhookResponse = {
  message?: string;
  [key: string]: unknown;
};

// API error type
export type ApiErrorInfo = {
  status?: number;
  message: string;
  suggestion: string;
};
