export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_name?: string;
}

export interface OllamaToolSpec {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: unknown;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string | null; tool_name?: string }>;
  tools?: OllamaToolSpec[];
  stream?: boolean;
  think?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      function: { name: string; arguments: Record<string, unknown> };
    }>;
  };
}

export class OllamaChatClient {
  private readonly host: string;

  constructor(host: string) {
    this.host = host.replace(/\/+$/, "");
  }

  public async getVersion(): Promise<string> {
    const res = await fetch(`${this.host}/api/version`);
    if (!res.ok) throw new Error(`Ollama version failed: ${res.status}`);
    const data = (await res.json()) as { version?: string };
    return data.version ?? "unknown";
  }

  public async chat(req: OllamaChatRequest): Promise<OllamaChatResponse> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: false }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ollama chat failed: ${res.status} ${txt}`);
    }
    return (await res.json()) as OllamaChatResponse;
  }
}


