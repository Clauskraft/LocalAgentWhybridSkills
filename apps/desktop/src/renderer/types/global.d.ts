import type { Chat, Message } from "../App";
import type { SettingsState } from "../hooks/useSettings";

declare global {
  interface Window {
    chat?: {
      // Chat history
      getChatHistory?: () => Promise<Chat[]>;
      loadChat?: (id: string) => Promise<Chat | null>;
      saveChat?: (chat: Chat) => void;
      deleteChat?: (id: string) => void;

      // Chat + LLM
      sendMessage?: (payload: {
        chatId: string;
        messages: Message[];
        settings: Record<string, unknown>;
      }) => Promise<{ content: string; toolCalls?: Message["toolCalls"] }>;
      checkOllama?: () => Promise<{ running: boolean }>;

      // Settings/config
      getConfig?: () => Promise<Partial<SettingsState>>;
      updateSettings?: (settings: Partial<SettingsState>) => void;

      // MCP setup
      getMcpServers?: () => Promise<Array<{ id: string; name: string; type: string; endpoint: string; enabled: boolean }>>;
      addMcpServer?: (server: unknown) => Promise<boolean>;
      removeMcpServer?: (name: string) => Promise<boolean>;
      getMcpCatalog?: () => Promise<unknown[]>;
      installMcpFromCatalog?: (serverId: string) => Promise<{
        success: boolean;
        error?: string;
        requiresAuth?: boolean;
        authEnvVar?: string;
      }>;
      autoSetupMcp?: (opts?: { includeAuth?: boolean }) => Promise<{
        success: boolean;
        installed: string[];
        skipped: Array<{ id: string; name: string; reason: string; authEnvVar?: string }>;
        requiresAuth: Array<{ id: string; name: string; authEnvVar?: string }>;
      }>;
    };
  }
}

export {};

