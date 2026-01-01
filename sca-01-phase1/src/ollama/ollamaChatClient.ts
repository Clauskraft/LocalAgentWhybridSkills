import type { OllamaChatRequest, OllamaChatResponse } from "./types.js";

export class OllamaChatClient {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public async getVersion(): Promise<string> {
    const url = `${this.baseUrl}/api/version`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Ollama version check failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { version?: string };
    return data.version ?? "unknown";
  }

  public async chat(req: OllamaChatRequest): Promise<OllamaChatResponse> {
    const url = `${this.baseUrl}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama chat failed: ${res.status} ${res.statusText} ${body}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    return data;
  }
}

