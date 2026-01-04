import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import type { Message, Session } from "../lib/types";

type Draft = { text: string; model: string };

function SidebarItem(props: { active: boolean; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={[
        "w-full text-left rounded-lg px-3 py-2 border",
        props.active ? "border-indigo-600/50 bg-indigo-600/10" : "border-slate-800 hover:bg-slate-900/50",
      ].join(" ")}
    >
      <div className="text-sm font-medium truncate">{props.title || "Untitled"}</div>
      {props.subtitle ? <div className="text-xs text-slate-400 truncate">{props.subtitle}</div> : null}
    </button>
  );
}

function ChatMessageBubble(props: { role: string; content: string | null }) {
  const isUser = props.role === "user";
  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed border",
          isUser ? "bg-indigo-600/20 border-indigo-600/30" : "bg-slate-900/70 border-slate-800",
        ].join(" ")}
      >
        <div className="text-xs mb-1 text-slate-400">{isUser ? "You" : "Assistant"}</div>
        <div className="whitespace-pre-wrap">{props.content ?? ""}</div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { api, logout, user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<Draft>({ text: "", model: "qwen3" });
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<Array<{ name: string }>>([]);
  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) ?? null, [sessions, activeSessionId]);

  async function refreshSessions(selectFirst = false) {
    const list = await api.listSessions(false);
    setSessions(list);
    if (selectFirst && !activeSessionId && list[0]) setActiveSessionId(list[0].id);
  }

  async function loadMessages(sessionId: string) {
    const msgs = await api.listMessages(sessionId);
    setMessages(msgs);
  }

  useEffect(() => {
    void (async () => {
      await refreshSessions(true);
      // Best-effort models (depends on OLLAMA_HOST on server)
      try {
        const m = await api.models();
        setModels(m);
      } catch {
        setModels([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    void loadMessages(activeSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  async function newChat() {
    const session = await api.createSession({ title: "New chat", model: draft.model });
    await refreshSessions(false);
    setActiveSessionId(session.id);
    setMessages([]);
  }

  async function send() {
    const text = draft.text.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const created = await api.createSession({ title: text.slice(0, 48), model: draft.model });
        sessionId = created.id;
        setActiveSessionId(sessionId);
        await refreshSessions(false);
      }

      // Persist user message
      const userMsg = await api.addMessage(sessionId, { role: "user", content: text });
      setMessages((m) => [...m, userMsg]);
      setDraft((d) => ({ ...d, text: "" }));

      // Ask model (public endpoint)
      const convo = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
        .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

      const res = await api.chat({ model: draft.model, messages: convo });
      const assistantText = res.content || "(empty response)";
      const assistantMsg = await api.addMessage(sessionId, { role: "assistant", content: assistantText });
      setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send_failed";
      setMessages((m) => [
        ...m,
        { id: `local-${Date.now()}`, sessionId: activeSessionId ?? "local", role: "assistant", content: `Error: ${msg}`, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      <aside className="border-r border-slate-900 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">SCA-01</div>
            <div className="font-semibold">Web UI</div>
          </div>
          <button onClick={logout} className="text-xs text-slate-300 hover:text-white underline">
            Logout
          </button>
        </div>

        <button onClick={newChat} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500">
          New chat
        </button>

        <div className="mt-4 space-y-2">
          {sessions.map((s) => (
            <SidebarItem
              key={s.id}
              active={s.id === activeSessionId}
              title={s.title}
              subtitle={s.model}
              onClick={() => setActiveSessionId(s.id)}
            />
          ))}
          {sessions.length === 0 ? <div className="text-sm text-slate-400 mt-4">No sessions yet.</div> : null}
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Logged in as <span className="text-slate-300">{user?.email}</span>
        </div>
      </aside>

      <main className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Session</div>
            <div className="text-lg font-semibold">{activeSession?.title ?? "New chat"}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Model</label>
            <select
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="qwen3">qwen3</option>
                  <option value="qwen3:latest">qwen3:latest</option>
                </>
              )}
            </select>
          </div>
        </header>

        <section className="card p-4 flex-1 overflow-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-slate-400 text-sm">Send a message to start.</div>
          ) : (
            messages.map((m) => <ChatMessageBubble key={m.id} role={m.role} content={m.content} />)
          )}
        </section>

        <footer className="card p-3">
          <div className="flex gap-2">
            <textarea
              className="flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              rows={2}
              placeholder="Type a message…"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send();
              }}
            />
            <button
              onClick={() => void send()}
              disabled={busy || !draft.text.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">Tip: Ctrl+Enter to send</div>
        </footer>
      </main>
    </div>
  );
}


