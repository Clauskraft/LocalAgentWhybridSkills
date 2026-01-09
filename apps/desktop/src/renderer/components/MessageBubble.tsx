import { memo } from 'react';
import type { Message } from '../App';
import { IconBolt, IconPlug, IconSettings, IconShield } from './icons';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
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
    <div className="flex gap-4 animate-fade-in group">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-md ${avatarBg} flex items-center justify-center text-white flex-shrink-0`}>
        {avatarIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm">{roleName}</span>
          {message.meta?.model && !isUser && (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded-full font-mono">
              {message.meta.model}
            </span>
          )}
          <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Text */}
        <div className="text-text-primary leading-relaxed prose prose-invert prose-sm max-w-none">
          {formatContent(message.content)}
        </div>

        {/* Tool Calls */}
        {message.toolCalls?.map((tc, i) => (
          <div key={i} className="mt-3 p-3 bg-bg-tertiary border border-border-primary rounded-lg">
            <div className="flex items-center gap-2 text-tdc-blue font-semibold text-sm mb-2">
              <IconPlug className="w-4 h-4" /> {tc.name}
            </div>
            <pre className="text-xs text-text-secondary bg-bg-primary p-2 rounded overflow-x-auto">
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
          <div key={i} className="relative my-3 group/code">
            {lang && (
              <div className="absolute top-0 left-0 px-2 py-1 text-xs text-text-muted bg-bg-elevated rounded-tl-lg">
                {lang}
              </div>
            )}
            <pre className="bg-bg-primary p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>{code.trim()}</code>
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(code.trim())}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-bg-hover text-text-muted rounded opacity-0 group-hover/code:opacity-100 hover:text-text-primary transition-all"
            >
              Kopiér
            </button>
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

