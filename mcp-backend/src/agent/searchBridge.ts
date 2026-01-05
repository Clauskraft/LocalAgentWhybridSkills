import { z } from 'zod';

const SEARCH_BRIDGE_URL = process.env.SEARCH_BRIDGE_URL || 'http://localhost:8810';

// Request/Response schemas
const SearchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
  filters: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional()
});

const UpsertRequestSchema = z.object({
  documents: z.array(z.record(z.unknown())),
  index_name: z.string().optional()
});

const SearchResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    content: z.string(),
    score: z.number(),
    metadata: z.record(z.unknown())
  })),
  total: z.number(),
  query: z.string(),
  took_ms: z.number()
});

const UpsertResponseSchema = z.object({
  status: z.string(),
  documents_processed: z.number(),
  index_name: z.string(),
  message: z.string()
});

const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  opensearch_status: z.string().optional(),
  vector_store_status: z.string().optional()
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type UpsertRequest = z.infer<typeof UpsertRequestSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type UpsertResponse = z.infer<typeof UpsertResponseSchema>;

export class SearchBridgeClient {
  private baseUrl: string;

  constructor(baseUrl: string = SEARCH_BRIDGE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async query(request: SearchRequest): Promise<SearchResponse> {
    const validatedRequest = SearchRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedRequest),
    });

    if (!response.ok) {
      throw new Error(`Search query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return SearchResponseSchema.parse(data);
  }

  async upsert(request: UpsertRequest): Promise<UpsertResponse> {
    const validatedRequest = UpsertRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedRequest),
    });

    if (!response.ok) {
      throw new Error(`Search upsert failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return UpsertResponseSchema.parse(data);
  }

  async health(): Promise<z.infer<typeof HealthResponseSchema>> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Search health check failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getQuerySchema(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/schema/query`);

    if (!response.ok) {
      throw new Error(`Failed to get query schema: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUpsertSchema(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/schema/upsert`);

    if (!response.ok) {
      throw new Error(`Failed to get upsert schema: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let searchClient: SearchBridgeClient | null = null;

export function getSearchClient(): SearchBridgeClient {
  if (!searchClient) {
    searchClient = new SearchBridgeClient();
  }
  return searchClient;
}

// Convenience functions
export async function searchDocuments(query: string, limit?: number, filters?: Record<string, unknown>, context?: Record<string, unknown>): Promise<SearchResponse> {
  const client = getSearchClient();
  return client.query({ query, limit, filters, context });
}

export async function upsertDocuments(documents: Array<Record<string, unknown>>, index_name?: string): Promise<UpsertResponse> {
  const client = getSearchClient();
  return client.upsert({ documents, index_name });
}
