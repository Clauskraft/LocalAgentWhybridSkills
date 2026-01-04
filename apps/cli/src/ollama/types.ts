export type OllamaRole = "system" | "user" | "assistant" | "tool";

export interface OllamaToolFunctionSpec {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface OllamaToolSpec {
  type: "function";
  function: OllamaToolFunctionSpec;
}

export interface OllamaToolCall {
  type: "function";
  function: {
    index?: number;
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaMessage {
  role: OllamaRole;
  content?: string;
  // used for tool result messages
  tool_name?: string;
  // used for assistant tool call messages
  tool_calls?: OllamaToolCall[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: false;
  tools?: OllamaToolSpec[];
  think?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
}

