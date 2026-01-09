import { useEffect, useState, useCallback } from 'react';
import type { Chat, Message } from '../App';
import { resolveBackendUrl } from '../lib/backend';
import { cleanChatTitle, isModelNotFoundError, commonModelFallbacks } from '../lib/modelUtils';

const DEFAULT_SETTINGS = {
  // Align with phase2 .env.production default, but browser-mode will also auto-fallback if missing.
  model: 'qwen2.5-coder:7b',
  ollamaHost: 'http://localhost:11434',
};

type Settings = {
  model: string;
  ollamaHost: string;
  backendUrl?: string;
  useCloud?: boolean;
  temperature?: number;
  contextLength?: number;
};

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
    meta: {},
  };
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDeletedChat, setLastDeletedChat] = useState<Chat | null>(null);

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
    const chatToDelete = chats.find(c => c.id === id);
    if (chatToDelete) {
      setLastDeletedChat(chatToDelete);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (id === currentChatId) {
        createChat();
      }
    }
  }, [chats, currentChatId, createChat]);

  const archiveChat = useCallback((id: string) => {
    setChats((prev) => prev.map(c => c.id === id ? { ...c, isArchived: !c.isArchived } : c));
  }, []);

  const undoDeleteChat = useCallback(() => {
    if (lastDeletedChat) {
      setChats((prev) => [lastDeletedChat, ...prev]);
      setCurrentChatId(lastDeletedChat.id);
      setMessages(lastDeletedChat.messages);
      setLastDeletedChat(null);
    }
  }, [lastDeletedChat]);

  const sendMessage = useCallback(async (content: string, settings?: Settings) => {
    if (!currentChatId) return;

    const userMsg = createMessage('user', content);
    setMessages((prev) => [...prev, userMsg]);
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== currentChatId) return c;
        const messages = [...c.messages, userMsg];
        // Auto-title naming for the first user message
        let title = c.title;
        if (c.messages.length === 0) {
          title = cleanChatTitle(content);
        }
        return { ...c, title, messages };
      })
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
        options: {
          temperature: settings?.temperature,
          num_ctx: settings?.contextLength,
        }
      };

      if (api?.sendMessage) {
        const attemptSend = async (model: string) => {
          return await api.sendMessage({ ...payload, model });
        };

        let resp: any;
        try {
          resp = await attemptSend(payload.model);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);

          // Best-effort cloud fallback: if model is missing upstream, try a safer default and persist it.
          const modelMissing =
            /model/i.test(msg) && /not found/i.test(msg) && (payload.useCloud || /Cloud chat failed/i.test(msg));

          if (modelMissing) {
            // Try "auto" first (cloud server default = omit model), then common fallbacks.
            const candidates = ['', 'qwen3:8b', 'qwen3', 'llama3.1', 'mistral'];
            for (const candidate of candidates) {
              // NOTE: empty string means "auto" (omit model in cloud IPC).
              if (candidate === payload.model) continue;
              try {
                const retry = await attemptSend(candidate);
                // Persist the working model for future sends (renderer-side settings)
                api?.updateSettings?.({ model: candidate });
                resp = retry;
                break;
              } catch {
                // keep trying candidates
              }
            }
          }

          if (!resp) throw e;
        }
        if (resp?.content) {
          const assistantMsg = createMessage('assistant', resp.content);
          assistantMsg.toolCalls = resp?.toolCalls;
          assistantMsg.meta = { model: resp?.model || payload.model || "Unknown" };
          setMessages((prev) => [...prev, assistantMsg]);
          setChats((prev) =>
            prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        }
      } else {
        // Browser mode (no Electron IPC):
        // - If "useCloud" is enabled (or a backend URL is configured), use the Phase 3 backend.
        // - Otherwise, talk directly to Ollama (best-effort; may require CORS support on Ollama).
        const backend = resolveBackendUrl(settings?.backendUrl);
        const wantsCloud = !!settings?.useCloud;

        if (wantsCloud || backend) {
          if (!backend) {
            throw new Error(
              "Cloud er slået til, men backend URL mangler. Sæt backend URL i Indstillinger → Cloud Backend, eller sæt VITE_BACKEND_URL i dit miljø."
            );
          }

          const res = await fetch(`${backend}/api/chat`, {
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
          assistantMsg.toolCalls = data?.message?.tool_calls;
          assistantMsg.meta = { model: data?.model || payload.model || "Cloud Model" };
          setMessages((prev) => [...prev, assistantMsg]);
          setChats((prev) =>
            prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        } else {
          const host = (payload.host ?? DEFAULT_SETTINGS.ollamaHost).replace(/\/+$/, "");

          const callOllama = async (model: string) => {
            return await fetch(`${host}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                messages: payload.messages,
                stream: false,
              }),
            });
          };

          let res = await callOllama(payload.model);
          if (!res.ok) {
            const txt = await res.text().catch(() => "");

            // Best-effort: if configured model doesn't exist, retry with the first installed model.
            const modelMissing = res.status === 404 && /model/i.test(txt) && /not found/i.test(txt);
            if (modelMissing) {
              try {
                const tagsRes = await fetch(`${host}/api/tags`, { method: "GET" });
                const tags = await tagsRes.json().catch(() => ({}));
                const first = Array.isArray(tags?.models) ? tags.models[0]?.name : undefined;
                if (typeof first === "string" && first.trim()) {
                  res = await callOllama(first.trim());
                  if (res.ok) {
                    const data = await res.json();
                    const content = data?.message?.content ?? data?.content ?? "";
                    const assistantMsg = createMessage('assistant', content);
                    assistantMsg.meta = { model: first.trim() };
                    setMessages((prev) => [...prev, assistantMsg]);
                    setChats((prev) =>
                      prev.map((c) => c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
                    );
                    return;
                  }
                }
              } catch {
                // fall through to error
              }
            }

            throw new Error(
              `Ollama chat fejlede: ${res.status} ${res.statusText} ${txt || "(ingen body)"} (tip: vælg en installeret model i Indstillinger → Modeller, eller kør i Electron for IPC)`
            );
          }
          const data = await res.json();
          const content = data?.message?.content ?? data?.content ?? "";
          const assistantMsg = createMessage('assistant', content);
          assistantMsg.meta = { model: params.model || payload.model };
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
    undoDeleteChat,
    archiveChat,
    sendMessage,
    lastDeletedChat,
  };
}

