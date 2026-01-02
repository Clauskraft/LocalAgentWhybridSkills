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
      const payload = {
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        model: settings?.model ?? DEFAULT_SETTINGS.model,
        host: settings?.ollamaHost ?? DEFAULT_SETTINGS.ollamaHost,
        backendUrl: settings?.backendUrl,
        useCloud: settings?.useCloud,
      };

      if (api?.sendMessage) {
        const resp = await api.sendMessage(payload);
        if (resp?.content) {
          const assistantMsg = createMessage('assistant', resp.content);
          // @ts-expect-error optional toolCalls
          assistantMsg.toolCalls = resp?.toolCalls;
          setMessages((prev) => [...prev, assistantMsg]);
          setChats((prev) =>
            prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        }
      } else {
        // Fallback: direct HTTP call to backendUrl (no mocks)
        const backend = settings?.backendUrl?.trim();
        if (!backend) throw new Error("Ingen backendUrl sat og IPC er ikke tilgængelig");
        const res = await fetch(`${backend.replace(/\\/+$/, "")}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: payload.model,
            messages: payload.messages,
            stream: false,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Cloud chat fejlede: ${res.status} ${res.statusText} ${txt}`);
        }
        const data = await res.json();
        const content = data?.message?.content ?? data?.content ?? "";
        const assistantMsg = createMessage('assistant', content);
        // @ts-expect-error optional toolCalls
        assistantMsg.toolCalls = data?.message?.tool_calls;
        setMessages((prev) => [...prev, assistantMsg]);
        setChats((prev) =>
          prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
        );
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

