import { z } from "zod";

const ROMA_BRIDGE_URL = process.env.ROMA_BRIDGE_URL || "http://localhost:8808";

// Request/Response schemas
const PlanRequestSchema = z.object({
  goal: z.string(),
  context: z.record(z.unknown()).optional(),
  strategy: z.enum(["react", "cot", "code_act"]).optional(),
});

const ActRequestSchema = z.object({
  task: z.string(),
  context: z.record(z.unknown()).optional(),
  tools: z.array(z.record(z.unknown())).optional(),
});

const PlanResponseSchema = z.object({
  plan: z.object({
    goal: z.string(),
    strategy: z.string(),
    subtasks: z.array(
      z.object({
        id: z.string(),
        goal: z.string(),
        task_type: z.string(),
        dependencies: z.array(z.string()),
      })
    ),
    estimated_steps: z.number(),
  }),
  status: z.string(),
});

const ActResponseSchema = z.object({
  result: z.object({
    task: z.string(),
    status: z.string(),
    context: z.record(z.unknown()).optional(),
    tools_used: z.array(z.record(z.unknown())),
    output: z.object({
      type: z.string(),
      content: z.string(),
      metadata: z.record(z.unknown()),
    }),
    node_type: z.string(),
  }),
  status: z.string(),
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type ActRequest = z.infer<typeof ActRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type ActResponse = z.infer<typeof ActResponseSchema>;

export class RomaBridgeClient {
  private baseUrl: string;

  constructor(baseUrl: string = ROMA_BRIDGE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async plan(request: PlanRequest): Promise<PlanResponse> {
    const validatedRequest = PlanRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
    });

    if (!response.ok) {
      throw new Error(`ROMA plan failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return PlanResponseSchema.parse(data);
  }

  async act(request: ActRequest): Promise<ActResponse> {
    const validatedRequest = ActRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/act`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
    });

    if (!response.ok) {
      throw new Error(`ROMA act failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return ActResponseSchema.parse(data);
  }

  async health(): Promise<{ status: string; version: string; roma_version?: string }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`ROMA health check failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPlanSchema(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/schema/plan`);

    if (!response.ok) {
      throw new Error(`Failed to get plan schema: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getActSchema(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/schema/act`);

    if (!response.ok) {
      throw new Error(`Failed to get act schema: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

let romaClient: RomaBridgeClient | null = null;

export function getRomaClient(): RomaBridgeClient {
  if (!romaClient) {
    romaClient = new RomaBridgeClient();
  }
  return romaClient;
}

export async function planTask(
  goal: string,
  context?: Record<string, unknown>,
  strategy?: "react" | "cot" | "code_act"
): Promise<PlanResponse> {
  const client = getRomaClient();
  return client.plan({ goal, context, strategy });
}

export async function actOnTask(
  task: string,
  context?: Record<string, unknown>,
  tools?: Array<Record<string, unknown>>
): Promise<ActResponse> {
  const client = getRomaClient();
  return client.act({ task, context, tools });
}

