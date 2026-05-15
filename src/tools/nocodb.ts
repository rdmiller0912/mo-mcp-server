// NocoDB tool registrations for mo-mcp-server

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as nocodb from '../services/nocodb-client.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_BULK_INSERT, MAX_RESPONSE_CHARS } from '../constants.js';

function truncateResponse(text: string): string {
  if (text.length <= MAX_RESPONSE_CHARS) return text;
  return (
    text.slice(0, MAX_RESPONSE_CHARS) +
    '\n\n[Response truncated. Use pagination (offset/limit) or filters (where) to retrieve smaller result sets.]'
  );
}

export function registerNocoDBTools(server: McpServer): void {

  server.registerTool(
    'nocodb_list_tables',
    {
      title: 'List NocoDB Tables',
      description:
        'Lists all tables in the Miller Operations NocoDB base. ' +
        'Returns each table\'s ID and title. Use the table ID (not the name) ' +
        'for all other NocoDB operations, because the NocoDB v2 API requires IDs.\n\n' +
        'Returns: Array of {id, title} for each table.\n\n' +
        'Example: Call this first to discover available tables before querying records.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const tables = await nocodb.listTables();
        const summary = tables.map((t) => ({ id: t.id, title: t.title }));
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ total: summary.length, tables: summary }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_get_table_schema',
    {
      title: 'Get NocoDB Table Schema',
      description:
        'Returns the column definitions for a NocoDB table, including column names, ' +
        'types (uidt), and whether each field is required or a primary key. ' +
        'Use this to understand a table\'s structure before reading or writing records.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID (e.g., "mhxtlsrn2rx5nqo"). ' +
        'Get this from nocodb_list_tables.\n\n' +
        'Returns: Array of column definitions with {id, title, uidt, rqd, pk}.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID (from nocodb_list_tables)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ table_id }) => {
      try {
        const columns = await nocodb.getTableSchema(table_id);
        const simplified = columns.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.uidt,
          required: c.rqd || false,
          primaryKey: c.pk || false,
        }));
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ total: simplified.length, columns: simplified }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_list_records',
    {
      title: 'List NocoDB Records',
      description:
        'Retrieves records from a NocoDB table with optional filtering, sorting, and pagination.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - limit (number, optional): Max records to return, 1-100, default 25\n' +
        '  - offset (number, optional): Number of records to skip for pagination, default 0\n' +
        '  - where (string, optional): NocoDB filter string. Examples:\n' +
        '      "(Status,eq,Open)" for exact match\n' +
        '      "(owner,eq,Sandra)" for owner filter (use short first names)\n' +
        '      "(Status,eq,Open)~and(Priority,eq,1 - High)" for multiple conditions\n' +
        '  - sort (string, optional): Sort string. Examples:\n' +
        '      "-created_date" for newest first\n' +
        '      "task_name" for alphabetical\n' +
        '  - fields (string, optional): Comma-separated field names to return\n\n' +
        'Returns: Records array with pagination info (totalRows, page, pageSize).\n\n' +
        'Important: SingleSelect values are case-sensitive exact matches. ' +
        'For the tasks table, use field name "task_name" not "title".',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
          .describe('Max records to return (1-100, default 25)'),
        offset: z.number().int().min(0).default(0)
          .describe('Records to skip for pagination'),
        where: z.string().optional()
          .describe('NocoDB filter string, e.g. "(Status,eq,Open)"'),
        sort: z.string().optional()
          .describe('Sort string, e.g. "-created_date" for newest first'),
        fields: z.string().optional()
          .describe('Comma-separated field names to return'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ table_id, limit, offset, where, sort, fields }) => {
      try {
        const result = await nocodb.listRecords(table_id, {
          limit, offset, where, sort, fields,
        });
        const text = truncateResponse(JSON.stringify(result, null, 2));
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_search_records',
    {
      title: 'Search NocoDB Records',
      description:
        'Searches for records in a NocoDB table using a partial text match on a specified field.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - search_field (string): Column name to search in\n' +
        '  - search_value (string): Text to search for (partial match, case-insensitive)\n' +
        '  - limit (number, optional): Max records to return, default 25\n\n' +
        'Returns: Matching records with pagination info.\n\n' +
        'Example: Search companies table for "Benz" in the "company_name" field.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        search_field: z.string().min(1).describe('Column name to search in'),
        search_value: z.string().min(1).describe('Text to search for (partial match)'),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
          .describe('Max records to return'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ table_id, search_field, search_value, limit }) => {
      try {
        const result = await nocodb.searchRecords(table_id, search_field, search_value, limit);
        const text = truncateResponse(JSON.stringify(result, null, 2));
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_get_record',
    {
      title: 'Get NocoDB Record',
      description:
        'Retrieves a single record by its row ID from a NocoDB table.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - record_id (string): The row ID of the record to retrieve\n\n' +
        'Returns: The full record with all fields.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        record_id: z.string().min(1).describe('Row ID of the record'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ table_id, record_id }) => {
      try {
        const record = await nocodb.getRecord(table_id, record_id);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_create_record',
    {
      title: 'Create NocoDB Record',
      description:
        'Creates a new record in a NocoDB table. Use nocodb_get_table_schema first ' +
        'to understand required fields and their types.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - data (object): Field values for the new record as key-value pairs. ' +
        'Keys must match exact column names (case-sensitive).\n\n' +
        'Returns: The created record with its assigned ID.\n\n' +
        'Important: SingleSelect and MultiSelect options cannot be set via API if ' +
        'the option does not already exist in the column definition. ' +
        'Add new options manually in the NocoDB UI first.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        data: z.record(z.unknown()).describe('Field values as key-value pairs'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ table_id, data }) => {
      try {
        const record = await nocodb.createRecord(table_id, data);
        return {
          content: [{
            type: 'text' as const,
            text: `Record created successfully.\n${JSON.stringify(record, null, 2)}`,
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_update_record',
    {
      title: 'Update NocoDB Record',
      description:
        'Updates fields on an existing NocoDB record. Only include the fields you want to change.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - record_id (string): The row ID of the record to update\n' +
        '  - data (object): Field values to update as key-value pairs. ' +
        'Only include changed fields.\n\n' +
        'Returns: The updated record.\n\n' +
        'Important: For the tasks table, close tasks by setting status to "Done" ' +
        'and closed_date to YYYY-MM-DD format.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        record_id: z.string().min(1).describe('Row ID of the record to update'),
        data: z.record(z.unknown()).describe('Fields to update as key-value pairs'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ table_id, record_id, data }) => {
      try {
        const record = await nocodb.updateRecord(table_id, record_id, data);
        return {
          content: [{
            type: 'text' as const,
            text: `Record updated successfully.\n${JSON.stringify(record, null, 2)}`,
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'nocodb_bulk_insert',
    {
      title: 'Bulk Insert NocoDB Records',
      description:
        'Inserts multiple records into a NocoDB table in a single operation. ' +
        'Maximum 10 records per call to prevent 502 errors from NocoDB.\n\n' +
        'Args:\n' +
        '  - table_id (string): The NocoDB table ID\n' +
        '  - records (array): Array of record objects, each with field values as key-value pairs. ' +
        'Maximum 10 records.\n\n' +
        'Returns: Confirmation of inserted records.\n\n' +
        'For more than 10 records, make multiple calls with batches of 10.',
      inputSchema: {
        table_id: z.string().min(1).describe('NocoDB table ID'),
        records: z.array(z.record(z.unknown()))
          .min(1).max(MAX_BULK_INSERT)
          .describe('Array of record objects (max 10)'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ table_id, records }) => {
      try {
        const result = await nocodb.bulkInsert(table_id, records);
        return {
          content: [{
            type: 'text' as const,
            text: `Successfully inserted ${records.length} records.\n${JSON.stringify(result, null, 2)}`,
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
