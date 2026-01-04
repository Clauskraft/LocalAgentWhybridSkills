import { useState, useRef, useEffect, memo, useCallback } from 'react';
import type { Message } from '../App';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { IconChevronDown, IconPlug, IconSend, IconShield, IconSettings } from './icons';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  currentModel: string;
  ollamaStatus: 'online' | 'offline' | 'checking';
  onSendMessage: (content: string) => Promise<void>;
  onOpenSettings: (tab: string) => void;
}

export const ChatArea = memo(function ChatArea({
  messages,
  isLoading,
  currentModel,
  ollamaStatus,
  onSendMessage,
  onOpenSettings,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleQuickStart = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  const autoResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
    setInput(target.value);
  }, []);

  return (
    <main className="flex-1 flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="px-6 py-3 border-b border-border-primary bg-bg-secondary flex items-center justify-between">
        {/* Model Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div>
              <div className="font-semibold text-sm">{currentModel}</div>
              <div className="text-xs text-text-muted">Ollama</div>
            </div>
            <IconChevronDown className="w-4 h-4 text-text-muted" />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-bg-secondary border border-border-primary rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
              <div className="px-3 py-2 text-xs text-text-muted border-b border-border-primary">
                Vælg model
              </div>
              {['qwen3', 'llama3.1', 'mistral', 'codellama'].map((model) => (
                <div
                  key={model}
                  onClick={() => {
                    // TODO: Update model
                    setShowModelDropdown(false);
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-bg-hover ${
                    model === currentModel ? 'bg-accent text-white' : ''
                  }`}
                >
                  {model}
                </div>
              ))}
              <div
                onClick={() => {
                  onOpenSettings('models');
                  setShowModelDropdown(false);
                }}
                className="px-3 py-2 text-sm text-text-muted border-t border-border-primary cursor-pointer hover:bg-bg-hover"
              >
                Flere modeller...
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenSettings('mcp')}
            className="px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded-md text-sm text-text-secondary hover:bg-bg-hover transition-colors flex items-center gap-2"
          >
            <IconPlug className="w-4 h-4" />
            MCP
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border border-border-primary rounded-md text-sm">
            <span className={`w-2 h-2 rounded-full ${
              ollamaStatus === 'online' ? 'bg-success' :
              ollamaStatus === 'offline' ? 'bg-error' : 'bg-warning animate-pulse'
            }`} />
            <span className="text-text-secondary">
              {ollamaStatus === 'online' ? 'Online' : ollamaStatus === 'offline' ? 'Offline' : 'Tjekker...'}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Messages / Welcome */}
      {messages.length === 0 ? (
        <WelcomeScreen onQuickStart={handleQuickStart} />
      ) : (
        <div className="flex-1 overflow-y-auto py-8">
          <div className="max-w-3xl mx-auto px-8 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-md bg-tdc-purple flex items-center justify-center text-white">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="text-sm text-text-muted">Tænker...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-bg-primary">
        <div className="max-w-3xl mx-auto">
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-3 focus-within:border-accent transition-colors shadow-sm">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Skriv en besked..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-text-primary placeholder-text-muted focus:outline-none min-h-[24px] max-h-[200px] py-1"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenSettings('mcp')}
                  className="w-9 h-9 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors flex items-center justify-center"
                  title="MCP Tools"
                >
                  <IconPlug className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-md"
                  title="Send (Enter)"
                >
                  <IconSend className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2 mt-2 border-t border-border-primary">
              <ToolButton icon={<IconShield className="w-3 h-3" />} label="Safe Mode" onClick={() => {}} />
              <ToolButton icon={<IconPlug className="w-3 h-3" />} label="Tools" onClick={() => onOpenSettings('mcp')} />
              <ToolButton icon={<IconSettings className="w-3 h-3" />} label="Prompt" onClick={() => onOpenSettings('prompts')} />
            </div>
          </div>
          
          <p className="text-center text-xs text-text-muted mt-3">
            SCA-01 kan udføre handlinger på din PC. Alle operationer logges.
          </p>
        </div>
      </div>
    </main>
  );
});

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
      className="px-2 py-1 text-xs text-text-muted border border-border-primary rounded-md hover:bg-bg-tertiary hover:text-text-secondary transition-colors flex items-center gap-1.5"
    >
      {icon} {label}
    </button>
  );
}
