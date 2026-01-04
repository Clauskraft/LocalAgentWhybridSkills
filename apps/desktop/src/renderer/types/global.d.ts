export {};

declare global {
  interface Window {
    sca01?: {
      chat?: {
        getConfig?: () => Promise<Record<string, unknown>>;
        sendMessage?: (payload: unknown) => Promise<{ content: string } | undefined>;
        updateSettings?: (partial: Record<string, unknown>) => Promise<void> | void;
        checkOllama?: () => Promise<boolean>;
      };
    };
  }
}
import type { Chat, Message } from '../App';
import type { SettingsState } from '../hooks/useSettings';

declare global {
  interface Window {
    chat?: {
      getChatHistory?: () => Promise<Chat[]>;
      loadChat?: (id: string) => Promise<Chat | null>;
      saveChat?: (chat: Chat) => void;
      deleteChat?: (id: string) => void;
      sendMessage?: (payload: { chatId: string; messages: Message[]; settings: Record<string, unknown> }) => Promise<{ content: string; toolCalls?: Message['toolCalls'] }>;
      checkOllama?: () => Promise<{ running: boolean }>;
      getConfig?: () => Promise<Partial<SettingsState>>;
      updateSettings?: (settings: Partial<SettingsState>) => void;
    };
  }
}

export {};

