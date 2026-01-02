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
      const api = (window as any).sca01?.chat;
      if (api?.sendMessage) {
        const resp = await api.sendMessage({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          model: settings?.model ?? DEFAULT_SETTINGS.model,
          host: settings?.ollamaHost ?? DEFAULT_SETTINGS.ollamaHost,
          backendUrl: settings?.backendUrl,
          useCloud: settings?.useCloud,
        });
        if (resp?.content) {
          const assistantMsg = createMessage('assistant', resp.content);
          // @ts-expect-error optional toolCalls
          assistantMsg.toolCalls = resp?.toolCalls;
          setMessages((prev) => [...prev, assistantMsg]);
          setChats((prev) =>
            prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Ukendt fejl';
      const assistantMsg = createMessage('assistant', `❌ Fejl: ${errMsg}`);
      setMessages((prev) => [...prev, assistantMsg]);
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

