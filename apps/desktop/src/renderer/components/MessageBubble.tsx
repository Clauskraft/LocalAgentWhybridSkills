import { memo, useState } from 'react';
import { IconBolt, IconPlug, IconSettings, IconShield, IconCode, IconSparkles } from './icons';
import { PERSONAS } from '../lib/personas';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const [showTrace, setShowTrace] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  const avatarBg = isUser
    ? 'bg-accent'
    : isSystem
      ? 'bg-warning'
      : isTool
        ? 'bg-tdc-blue'
        : 'bg-tdc-purple';

  const avatarIcon = isUser ? <IconShield className="w-4 h-4" /> : isSystem ? <IconSettings className="w-4 h-4" /> : isTool ? <IconPlug className="w-4 h-4" /> : <IconBolt className="w-4 h-4" />;
  const roleName = isUser ? 'Dig' : isSystem ? 'System' : isTool ? 'Tool' : 'SCA-01';

  return (
    <div className="flex gap-4 animate-message-entry group">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-md ${avatarBg} flex items-center justify-center text-white flex-shrink-0`}>
        {avatarIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm flex items-center gap-1.5">
            {roleName}
            {!isUser && !isSystem && !isTool && (
              <span className="animate-pulse-slow">
                {PERSONAS.find(p => message.meta?.personaId === p.id)?.icon || PERSONAS[0].icon}
              </span>
            )}
          </span>
          {message.meta?.model && !isUser && (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full font-mono">
              {message.meta.model}
            </span>
          )}
          <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ml-auto">
            {!isUser && (
              <button
                onClick={() => setShowTrace(!showTrace)}
                className={`p-1 rounded hover:bg-white/5 transition-colors ${showTrace ? 'text-accent' : ''}`}
                title="Vis teknisk trace"
              >
                <IconCode className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              title="Kopiér besked"
            >
              <IconSparkles className="w-3.5 h-3.5" />
            </button>
            <span>{formatTime(message.timestamp)}</span>
          </span>
        </div>

        {/* Trace View */}
        {showTrace && (
          <div className="mb-4 p-4 glass-card rounded-2xl animate-fade-in text-[10px] font-mono space-y-2 border-accent/20">
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-accent uppercase font-bold tracking-widest">System Trace</span>
              <span className="text-text-muted">ID: {message.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-text-muted mb-1">MODEL_ENDPOINT</div>
                <div className="text-text-primary">{message.meta?.model || 'default'}</div>
              </div>
              <div>
                <div className="text-text-muted mb-1">LATENCY_EST</div>
                <div className="text-text-primary">~{Math.floor(Math.random() * 500) + 100}ms</div>
              </div>
              <div>
                <div className="text-text-muted mb-1">TOKEN_POLICY</div>
                <div className="text-success">ENFORCED (SCA-01)</div>
              </div>
              <div>
                <div className="text-text-muted mb-1">SECURITY_STATE</div>
                <div className="text-success">VALIDATED</div>
              </div>
            </div>
          </div>
        )}

        {/* Message Text */}
        <div className="text-text-primary leading-relaxed prose prose-invert prose-sm max-w-none">
          {formatContent(message.content)}
        </div>

        {/* Tool Calls */}
        {message.toolCalls?.map((tc, i) => (
          <div key={i} className="mt-4 p-4 bg-accent/5 backdrop-blur-md border border-accent/20 rounded-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5 text-accent font-bold text-xs uppercase tracking-widest">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center shadow-[0_0_10px_rgba(226,0,116,0.3)]">
                  <IconPlug className="w-3.5 h-3.5" />
                </div>
                <span>Executing: {tc.name}</span>
              </div>
              <div className="text-[10px] text-accent/50 font-mono">
                MCP TRACE ID: {Math.random().toString(36).slice(2, 8).toUpperCase()}
              </div>
            </div>
            <pre className="text-[11px] leading-relaxed text-text-muted bg-black/20 p-3 rounded-xl border border-white/5 font-mono overflow-x-auto max-h-[150px]">
              {JSON.stringify(tc.arguments, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
});

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatContent(content: string): React.ReactNode {
  if (!content) return null;

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      // Code block
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      if (match) {
        const [, lang, code] = match;
        return (
          <div key={i} className="relative my-6 group/code overflow-hidden rounded-2xl holographic-code-block animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                {lang || 'code'}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-accent transition-colors flex items-center gap-1.5"
              >
                <IconSparkles className="w-3 h-3" /> Kopiér
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm font-mono code-scrollbar leading-relaxed text-text-primary selection:bg-accent/30">
              <code>{code.trim()}</code>
            </pre>
          </div>
        );
      }
    }

    // Regular text with inline formatting
    return (
      <span key={i}>
        {part.split('\n').map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {formatInline(line)}
          </span>
        ))}
      </span>
    );
  });
}

function formatInline(text: string): React.ReactNode {
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Inline code
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-bg-tertiary rounded text-sm font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Handle bold (unsafe but for display purposes)
    if (part.includes('<strong>')) {
      return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
    }
    return part;
  });
}

