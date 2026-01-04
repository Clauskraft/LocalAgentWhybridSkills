export type TokenResponse = {
  user?: { id: string; email: string; displayName?: string | null };
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type Session = {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  toolCalls?: unknown;
  toolName?: string | null;
  createdAt: string;
};

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };


