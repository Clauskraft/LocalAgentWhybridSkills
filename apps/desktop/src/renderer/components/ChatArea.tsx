import { useState, useRef, useEffect, memo, useCallback } from 'react';
import type { Message } from '../App';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { SmartSuggestions } from './SmartSuggestions';
import { MultiModalInput } from './MultiModalInput';
import { NeuralVisualizer } from './NeuralVisualizer';
import { PredictiveInterface } from './PredictiveInterface';
import { IconSend, IconChevronDown, IconSettings, IconShield, IconBolt, IconPlus, IconPlug, IconCircle } from './icons';
import { PERSONAS, Persona } from '../lib/personas';
import { StatusMenu } from './StatusMenu';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  currentModel: string;
  ollamaStatus: 'online' | 'offline' | 'checking';
  security: {
    fullAccess: boolean;
    autoApprove: boolean;
    safeDirsCount: number;
    useCloud: boolean;
  };
  onSendMessage: (content: string) => Promise<void>;
  onOpenSettings: (tab: string) => void;
  onSelectModel: (model: string) => void;
  cuttingEdgeMode: boolean;
  setCuttingEdgeMode: (active: boolean) => void;
  immersiveMode: boolean;
  setImmersiveMode: (active: boolean) => void;
  mcpServersCount: number;
  personaId?: string;
  onUpdatePersona?: (id: string) => void;
}

export const ChatArea = memo(function ChatArea({
  messages,
  isLoading,
  currentModel,
  ollamaStatus,
  security,
  onSendMessage,
  onOpenSettings,
  onSelectModel,
  cuttingEdgeMode,
  setCuttingEdgeMode,
  immersiveMode,
  setImmersiveMode,
  mcpServersCount,
  personaId = 'architect',
  onUpdatePersona,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');

  // Debounce predictive trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState("");
  const [showNeuralVisualizer, setShowNeuralVisualizer] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!showModelDropdown) return;

    let alive = true;
    const loadModels = async () => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        const api = (window as any).sca01?.chat;
        const list = await api?.getModels?.();
        const names = Array.isArray(list) ? list.map((m: any) => String(m?.name ?? "")).filter(Boolean) : [];

        // Fallback: if cloud model list isn't exposed, show a small, safe default list + allow custom entry.
        // In cloud mode, include an "Auto" option (empty string) to use server default.
        const fallback = ['qwen3:8b', 'qwen3', 'llama3.1', 'mistral', 'codellama'];
        const base = security.useCloud ? [""] : [];
        const merged = Array.from(new Set([...base, currentModel, ...names, ...fallback].filter((v) => v !== undefined)));
        if (alive) setModels(merged);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Kunne ikke hente modeller";
        if (alive) {
          const base = security.useCloud ? [""] : [];
          setModels([...base, currentModel, 'qwen3:8b', 'qwen3', 'llama3.1', 'mistral', 'codellama'].filter((v) => v !== undefined));
          setModelsError(msg);
        }
      } finally {
        if (alive) setModelsLoading(false);
      }
    };

    loadModels();
    return () => {
      alive = false;
    };
  }, [showModelDropdown, currentModel]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput('');
    await onSendMessage(content);
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // LOOP 8: Predictive Interface Handler
  const handlePredictionSelect = useCallback((prediction: any) => {
    if (prediction.type === 'text') {
      setInput(prediction.content);
      inputRef.current?.focus();
    } else if (prediction.type === 'action' && prediction.action) {
      prediction.action();
    }
  }, []);

  const handleQuickStart = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  // LOOP 4: Multi-Modal Input Handlers
  const handleVoiceInput = useCallback(async (audioBlob: Blob) => {
    // Simulate voice-to-text processing
    const formData = new FormData();
    formData.append('audio', audioBlob);

    try {
      // In a real implementation, send to speech-to-text service
      // For now, simulate with a placeholder message
      await onSendMessage("🎤 [Voice Input Processed] - Audio message received and transcribed");
    } catch (error) {
      console.error('Voice input processing failed:', error);
      await onSendMessage("❌ Failed to process voice input");
    }
  }, [onSendMessage]);

  const handleDrawingInput = useCallback(async (imageData: string) => {
    // Simulate image analysis
    try {
      // In a real implementation, send to image analysis service
      // For now, simulate with a placeholder message
      await onSendMessage(`🎨 [Drawing Input] - Image data received (${imageData.length} bytes)`);
    } catch (error) {
      console.error('Drawing input processing failed:', error);
      await onSendMessage("❌ Failed to process drawing input");
    }
  }, [onSendMessage]);

  const autoResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
    setInput(target.value);
  }, []);

  const untrusted = detectUntrustedContent(messages);
  const displayModel = currentModel?.trim() ? currentModel : "Auto";

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 bg-gradient-to-br from-bg-primary via-bg-primary to-bg-secondary/30 relative overflow-hidden">
      {/* LOOP 1: Glassmorphism Header */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-transparent to-accent/10 opacity-50 rounded-b-lg" />
        {/* LOOP 1: Enhanced Model Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <div className="text-left">
              <div className="font-semibold text-sm text-text-primary">🤖 {displayModel}</div>
              <div className="text-xs text-accent font-medium">{security.useCloud ? '☁️ Cloud' : '🏠 Local'}</div>
            </div>
            <IconChevronDown className={`w-4 h-4 text-text-primary transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full left-0 mt-3 w-72 glass-card rounded-2xl z-50 overflow-hidden animate-slide-up border-accent/20">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/5 border-b border-white/5">
                🤖 Intelligent Models
              </div>
              {modelsError && (
                <div className="px-4 py-3 text-xs text-warning bg-warning/5 border-b border-white/5">
                  ⚠️ {security.useCloud
                    ? "Cloud services restricted. Manual entry only."
                    : "Local engine offline. Check Ollama status."}
                </div>
              )}
              {modelsLoading ? (
                <div className="px-6 py-8 text-xs text-text-muted flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Synchronizing core models...
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {models.map((model) => (
                    <div
                      key={model}
                      onClick={() => {
                        onSelectModel(model);
                        setCustomModel("");
                        setShowModelDropdown(false);
                      }}
                      className={`px-4 py-3 cursor-pointer transition-all duration-300 flex items-center justify-between group ${model === currentModel
                        ? 'bg-accent/20 text-accent'
                        : 'text-text-primary hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${model === currentModel ? 'bg-accent shadow-[0_0_8px_rgba(226,0,116,0.8)]' : 'bg-white/20'}`} />
                        <span className="text-sm font-medium">{model?.trim() ? model : "Auto Detect"}</span>
                      </div>
                      {model === currentModel && (
                        <IconSparkles className="w-3.5 h-3.5 text-accent opacity-50" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 py-4 border-t border-white/5 bg-white/5">
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Skriv modelnavn..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:border-accent outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = customModel.trim();
                      if (!next) return;
                      onSelectModel(next);
                      setShowModelDropdown(false);
                    }
                  }}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn btn-secondary px-3 py-2 text-xs flex-1"
                    onClick={() => {
                      const next = customModel.trim();
                      if (!next) return;
                      onSelectModel(next);
                      setShowModelDropdown(false);
                    }}
                  >
                    Brug
                  </button>
                  <button
                    className="btn btn-secondary px-2 py-1 text-xs"
                    onClick={() => {
                      setModelsError(null);
                      setModelsLoading(true);
                      // Trigger reload by toggling dropdown state
                      setShowModelDropdown(false);
                      setTimeout(() => setShowModelDropdown(true), 0);
                    }}
                  >
                    Opdatér
                  </button>
                </div>
              </div>
              <div
                onClick={() => {
                  onOpenSettings('models');
                  setShowModelDropdown(false);
                }}
                className="px-3 py-2 text-sm text-text-muted border-t border-border-primary cursor-pointer hover:bg-bg-hover"
              >
                Flere modeller…
              </div>
            </div>
          )}
        </div>

        {/* Persona Selector */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              onClick={() => onUpdatePersona?.(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${personaId === p.id
                ? 'bg-accent text-white shadow-[0_0_15px_rgba(226,0,116,0.3)] scale-105'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              title={p.description}
            >
              <span className="text-sm">{p.icon}</span>
              {personaId === p.id && (
                <span className="text-[10px] font-black uppercase tracking-wider animate-fade-in whitespace-nowrap">
                  {p.name.split(' ')[1]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Simplified Status Group */}
        <StatusMenu
          ollamaStatus={ollamaStatus}
          showNeuralVisualizer={showNeuralVisualizer}
          setShowNeuralVisualizer={setShowNeuralVisualizer}
          onOpenSettings={onOpenSettings}
          security={security}
          cuttingEdgeMode={cuttingEdgeMode}
          setCuttingEdgeMode={setCuttingEdgeMode}
          immersiveMode={immersiveMode}
          setImmersiveMode={setImmersiveMode}
          mcpServersCount={mcpServersCount}
        />
      </header>

      {untrusted.flagged && (
        <div className="px-6 py-2 border-b border-border-primary bg-bg-secondary">
          <div className="max-w-3xl mx-auto px-2">
            <div className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-secondary">
              <span className="text-warning">⚠️ Untrusted content detected.</span>{" "}
              This chat contains instruction-like text that could be prompt-injection. Tools are still gated by policy and approvals.
              {untrusted.reasons.length > 0 && (
                <span className="text-text-muted"> ({untrusted.reasons.join(", ")})</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages / Welcome */}
      {messages.length === 0 ? (
        <WelcomeScreen onQuickStart={handleQuickStart} />
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-8 custom-scrollbar relative scroll-smooth"
        >
          <div className="max-w-3xl mx-auto px-8 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <ThinkingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll Button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-10 right-10 w-12 h-12 glass-card rounded-full flex items-center justify-center text-accent shadow-2xl animate-bounce holographic-glow border-accent/40 z-30 transition-all hover:scale-110 active:scale-95"
              title="Gå til nyeste beskeder"
            >
              <IconChevronDown className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* LOOP 3: Smart Input Area with AI Suggestions */}
      <div className="relative p-4 bg-bg-primary">
        <div className="max-w-3xl mx-auto">
          {/* LOOP 8: Smart Suggestions and Predictive Interface positioned above input */}
          <div className="relative mb-2">
            <SmartSuggestions
              input={debouncedInput}
              onSuggestionClick={(suggestion) => setInput(suggestion)}
              isLoading={isLoading}
            />
            <PredictiveInterface
              input={debouncedInput}
              messages={messages}
              isLoading={isLoading}
              onPredictionSelect={handlePredictionSelect}
            />
          </div>

          <div className="relative bg-bg-secondary border border-border-primary rounded-2xl p-3 focus-within:border-accent transition-all duration-200 focus-within:shadow-lg focus-within:shadow-accent/20">
            {/* Multi-Modal Input Controls */}
            <MultiModalInput
              onTextInput={setInput}
              onVoiceInput={handleVoiceInput}
              onDrawingInput={handleDrawingInput}
              isLoading={isLoading}
            />

            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Spørg SCA-01 om hvad som helst..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-text-primary placeholder-text-muted focus:outline-none min-h-[32px] max-h-[200px] py-2 text-sm leading-relaxed"
              />
              <div className="flex gap-1.5 pb-1">
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 btn-holographic
                    ${!input.trim() || isLoading
                      ? 'bg-bg-tertiary text-text-muted cursor-not-allowed opacity-50'
                      : 'bg-accent text-white shadow-[0_0_15px_rgba(226,0,116,0.3)] hover:shadow-[0_0_25px_rgba(226,0,116,0.5)] transform hover:scale-105 active:scale-95'
                    }
                  `}
                  title="Send (Enter)"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <div className="relative flex items-center justify-center">
                      {input.trim() && (
                        <div className="absolute inset-0 bg-accent rounded-full animate-pulse-ring opacity-40" />
                      )}
                      <IconSend className="w-4 h-4 relative z-10" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-text-muted mt-3">
            SCA-01 kan udføre handlinger på din PC. Alle operationer logges.
          </p>
        </div>
      </div>

      {/* LOOP 6: Neural Network Visualizer */}
      <NeuralVisualizer
        isActive={showNeuralVisualizer}
        inputData={input}
        outputData={messages[messages.length - 1]?.content}
      />
    </main>
  );
});

function detectUntrustedContent(messages: Message[]): { flagged: boolean; reasons: string[] } {
  const reasons = new Set<string>();

  const needles: Array<{ label: string; re: RegExp }> = [
    { label: "override_instructions", re: /\b(ignore|override)\b.*\b(instruction|rules|policy)\b/i },
    { label: "reveal_system", re: /\b(system prompt|developer message|hidden instructions)\b/i },
    { label: "exfiltrate_secrets", re: /\b(token|api key|credential|password|refresh token)\b/i },
    { label: "tool_escalation", re: /\b(run|execute)\b.*\b(command|powershell|shell)\b/i },
  ];

  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = m.content ?? "";
    for (const n of needles) {
      if (n.re.test(text)) reasons.add(n.label);
    }
  }

  return { flagged: reasons.size > 0, reasons: Array.from(reasons) };
}

function ToolButton({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs text-text-muted border border-border-primary rounded-md hover:bg-bg-tertiary hover:text-text-secondary transition-colors flex items-center gap-1"
    >
      {icon} {label}
    </button>
  );
}

