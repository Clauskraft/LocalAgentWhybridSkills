import { useEffect, useState, useCallback } from 'react';
import type { Chat, Message } from '../App';

const DEFAULT_SETTINGS = {
  model: 'qwen3',
  ollamaHost: 'http://localhost:11434',
};

type Settings = {
  model: string;
  ollamaHost: string;
};

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // load draft chat on mount
  useEffect(() => {
    const initialChat: Chat = {
      id: crypto.randomUUID(),
      title: 'Ny samtale',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setChats([initialChat]);
    setCurrentChatId(initialChat.id);
  }, []);

  const createChat = useCallback(() => {
    const chat: Chat = {
      id: crypto.randomUUID(),
      title: 'Ny samtale',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setChats((prev) => [chat, ...prev]);
    setMessages([]);
    setCurrentChatId(chat.id);
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentChatId(id);
    const found = chats.find((c) => c.id === id);
    setMessages(found?.messages ?? []);
  }, [chats]);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (id === currentChatId) {
      createChat();
    }
  }, [currentChatId, createChat]);

  const sendMessage = useCallback(async (content: string, settings?: Settings) => {
    if (!currentChatId) return;

    const userMsg = createMessage('user', content);
    setMessages((prev) => [...prev, userMsg]);
    setChats((prev) =>
      prev.map((c) => c.id === currentChatId ? { ...c, title: content.slice(0, 40), messages: [...c.messages, userMsg] } : c)
    );

    setIsLoading(true);
    try {
      // If backend IPC is available, call it
      const api = (window as any).sca01?.chat;
      if (api?.sendMessage) {
        const resp = await api.sendMessage({
          messages: [...messages, userMsg],
          model: settings?.model ?? DEFAULT_SETTINGS.model,
          host: settings?.ollamaHost ?? DEFAULT_SETTINGS.ollamaHost,
        });
        if (resp?.content) {
          const assistantMsg = createMessage('assistant', resp.content);
          setMessages((prev) => [...prev, assistantMsg]);
          setChats((prev) =>
            prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        }
      } else {
        // Fallback: echo
        const assistantMsg = createMessage('assistant', '▶️ (stub) Meddelelsen er modtaget. Backend-IPC mangler.');
        setMessages((prev) => [...prev, assistantMsg]);
        setChats((prev) =>
          prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId, messages]);

  return {
    chats,
    currentChatId,
    messages,
    isLoading,
    createChat,
    selectChat,
    deleteChat,
    sendMessage,
  };
}
import { useCallback, useEffect, useState } from 'react';
import type { Chat, Message } from '../App';

function newChat(): Chat {
  const id = `chat-${Date.now()}`;
  return {
    id,
    title: 'Ny samtale',
    createdAt: new Date().toISOString(),
    messages: [],
  };
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load history from preload if available
  useEffect(() => {
    (async () => {
      try {
        const history = (await window.chat?.getChatHistory?.()) ?? [];
        setChats(history);
        if (history[0]) {
          setCurrentChatId(history[0].id);
          setMessages(history[0].messages || []);
        } else {
          const c = newChat();
          setChats([c]);
          setCurrentChatId(c.id);
        }
      } catch (e) {
        console.error('useChat: failed to load history', e);
        const c = newChat();
        setChats([c]);
        setCurrentChatId(c.id);
      }
    })();
  }, []);

  const createChat = useCallback(() => {
    const c = newChat();
    setChats((prev) => [c, ...prev]);
    setMessages([]);
    setCurrentChatId(c.id);
  }, []);

  const selectChat = useCallback(async (id: string) => {
    setCurrentChatId(id);
    const chat = await window.chat?.loadChat?.(id);
    setMessages(chat?.messages || []);
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    window.chat?.deleteChat?.(id);
    if (id === currentChatId) {
      const c = newChat();
      setChats((prev) => [c, ...prev]);
      setCurrentChatId(c.id);
      setMessages([]);
    }
  }, [currentChatId]);

  const sendMessage = useCallback(async (content: string, settings: Record<string, unknown>) => {
    if (!currentChatId) return;
    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const payload = {
        chatId: currentChatId,
        messages: [...messages, userMessage],
        settings,
      };
      const resp = await window.chat?.sendMessage?.(payload);
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: resp?.content ?? '❌ Ingen respons',
        toolCalls: resp?.toolCalls,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      // Persist
      const chat: Chat = {
        id: currentChatId,
        title: payload.messages[0]?.content?.slice(0, 40) || 'Ny samtale',
        createdAt: new Date().toISOString(),
        messages: [...payload.messages, assistantMessage],
      };
      window.chat?.saveChat?.(chat);
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== currentChatId);
        return [chat, ...filtered];
      });
    } catch (e) {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: `❌ Fejl: ${e instanceof Error ? e.message : 'Ukendt fejl'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId, messages]);

  return {
    chats,
    currentChatId,
    messages,
    isLoading,
    createChat,
    selectChat,
    deleteChat,
    sendMessage,
  };
}

