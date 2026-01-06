import type { Chat, Message } from "../App";
import type { SettingsState } from "../hooks/useSettings";

// Pulse+ Types (inline for renderer isolation)
type PulseCategory = 'THREAT' | 'AI_INSIGHT' | 'BUSINESS' | 'ACTIVITY';
type PulsePriority = 'critical' | 'high' | 'medium' | 'low';
type PulseFeedback = 'up' | 'down' | null;

interface PulseCardData {
  id: string;
  category: PulseCategory;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  priority: PulsePriority;
  relevanceScore: number;
  feedback: PulseFeedback;
  tags: string[];
  status: string;
}

interface PulsePreferences {
  enabled: boolean;
  dailyTime: string;
  maxCards: number;
  categories: Record<PulseCategory, { enabled: boolean; weight: number }>;
  interests: string[];
  blockedKeywords: string[];
}

interface PulseAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      pulse?: {
        getTodayCards: () => Promise<PulseAPIResponse<PulseCardData[]>>;
        getRecentCards: (days?: number) => Promise<PulseAPIResponse<PulseCardData[]>>;
        generateDigest: () => Promise<PulseAPIResponse<unknown>>;
        markViewed: (cardId: string) => Promise<PulseAPIResponse<void>>;
        saveCard: (cardId: string) => Promise<PulseAPIResponse<void>>;
        dismissCard: (cardId: string) => Promise<PulseAPIResponse<void>>;
        submitFeedback: (cardId: string, feedback: 'up' | 'down') => Promise<PulseAPIResponse<void>>;
        addCuration: (topic: string) => Promise<PulseAPIResponse<unknown>>;
        getPreferences: () => Promise<PulseAPIResponse<PulsePreferences>>;
        updatePreferences: (prefs: Partial<PulsePreferences>) => Promise<PulseAPIResponse<void>>;
        getSchedulerStatus: () => Promise<PulseAPIResponse<unknown>>;
        runNow: () => Promise<PulseAPIResponse<void>>;
      };
      shell?: {
        openExternal: (url: string) => Promise<void>;
      };
    };
    pulse?: {
      getTodayCards: () => Promise<PulseAPIResponse<PulseCardData[]>>;
      getRecentCards: (days?: number) => Promise<PulseAPIResponse<PulseCardData[]>>;
      generateDigest: () => Promise<PulseAPIResponse<unknown>>;
      markViewed: (cardId: string) => Promise<PulseAPIResponse<void>>;
      saveCard: (cardId: string) => Promise<PulseAPIResponse<void>>;
      dismissCard: (cardId: string) => Promise<PulseAPIResponse<void>>;
      submitFeedback: (cardId: string, feedback: 'up' | 'down') => Promise<PulseAPIResponse<void>>;
      addCuration: (topic: string) => Promise<PulseAPIResponse<unknown>>;
      getPreferences: () => Promise<PulseAPIResponse<PulsePreferences>>;
      updatePreferences: (prefs: Partial<PulsePreferences>) => Promise<PulseAPIResponse<void>>;
      getSchedulerStatus: () => Promise<PulseAPIResponse<unknown>>;
      runNow: () => Promise<PulseAPIResponse<void>>;
    };
    shell?: {
      openExternal: (url: string) => Promise<void>;
    };
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

