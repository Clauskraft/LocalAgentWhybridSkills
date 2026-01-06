/**
 * PulseCard Component
 *
 * Viser et enkelt Pulse insight card med kategori, titel, resumé og actions.
 * Understøtter feedback (👍/👎), gem og ignorer.
 */

import { memo, useState, useCallback } from 'react';

// Types (inline for renderer isolation)
type PulseCategory = 'THREAT' | 'AI_INSIGHT' | 'BUSINESS' | 'ACTIVITY';
type PulsePriority = 'critical' | 'high' | 'medium' | 'low';
type PulseFeedback = 'up' | 'down' | null;

interface PulseCardData {
  id: string;
  category: PulseCategory;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  priority: PulsePriority;
  relevanceScore: number;
  feedback: PulseFeedback;
  tags: string[];
}

interface PulseCardProps {
  card: PulseCardData;
  onFeedback: (cardId: string, feedback: 'up' | 'down') => void;
  onSave: (cardId: string) => void;
  onDismiss: (cardId: string) => void;
  onOpenSource?: (url: string) => void;
}

// Category styling
const CATEGORY_CONFIG: Record<PulseCategory, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  THREAT: {
    label: 'Cybersikkerhed',
    emoji: '🔴',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  AI_INSIGHT: {
    label: 'AI Indsigter',
    emoji: '🟣',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
  },
  BUSINESS: {
    label: 'Forretning',
    emoji: '🟡',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  ACTIVITY: {
    label: 'Aktivitet',
    emoji: '🔵',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
  },
};

const PRIORITY_CONFIG: Record<PulsePriority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  critical: { label: 'Kritisk', color: 'text-red-500', bgColor: 'bg-red-500/20' },
  high: { label: 'Høj', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  low: { label: 'Lav', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

export const PulseCard = memo(function PulseCard({
  card,
  onFeedback,
  onSave,
  onDismiss,
  onOpenSource,
}: PulseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<PulseFeedback>(card.feedback);

  const categoryConfig = CATEGORY_CONFIG[card.category];
  const priorityConfig = PRIORITY_CONFIG[card.priority];

  const handleFeedback = useCallback((feedback: 'up' | 'down') => {
    setLocalFeedback(feedback);
    onFeedback(card.id, feedback);
  }, [card.id, onFeedback]);

  const handleOpenSource = useCallback(() => {
    if (card.sourceUrl && onOpenSource) {
      onOpenSource(card.sourceUrl);
    }
  }, [card.sourceUrl, onOpenSource]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Lige nu';
    if (diffHours < 24) return `${diffHours}t siden`;
    if (diffHours < 48) return 'I går';
    return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`
        relative rounded-xl border-l-4 backdrop-blur-sm
        ${categoryConfig.borderColor} ${categoryConfig.bgColor}
        hover:shadow-lg hover:${categoryConfig.glowColor}
        transition-all duration-300 ease-out
        ${isExpanded ? 'ring-1 ring-white/10' : ''}
      `}
    >
      {/* Priority Badge (for critical/high) */}
      {(card.priority === 'critical' || card.priority === 'high') && (
        <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
          {priorityConfig.label}
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg">{categoryConfig.emoji}</span>
            <span className={`text-xs font-medium ${categoryConfig.color}`}>
              {categoryConfig.label}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {formatTimestamp(card.timestamp)}
          </span>
        </div>

        {/* Title */}
        <h3
          className="mt-2 text-sm font-semibold text-text-primary leading-tight cursor-pointer hover:text-accent transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {card.title}
        </h3>
      </div>

      {/* Summary */}
      <div className="px-4 pb-3">
        <p className={`text-xs text-text-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
          {card.summary}
        </p>

        {/* Tags (shown when expanded) */}
        {isExpanded && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {card.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] rounded-full bg-white/5 text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source */}
      <div className="px-4 pb-2">
        <button
          onClick={handleOpenSource}
          disabled={!card.sourceUrl}
          className={`
            text-xs text-text-muted hover:text-accent transition-colors
            ${card.sourceUrl ? 'cursor-pointer' : 'cursor-default'}
          `}
        >
          {card.source}
          {card.sourceUrl && (
            <span className="ml-1 opacity-50">↗</span>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        {/* Feedback Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFeedback('up')}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${localFeedback === 'up'
                ? 'bg-green-500/20 text-green-400'
                : 'text-text-muted hover:bg-white/5 hover:text-green-400'}
            `}
            title="Relevant"
          >
            <span className="text-sm">👍</span>
          </button>
          <button
            onClick={() => handleFeedback('down')}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${localFeedback === 'down'
                ? 'bg-red-500/20 text-red-400'
                : 'text-text-muted hover:bg-white/5 hover:text-red-400'}
            `}
            title="Ikke relevant"
          >
            <span className="text-sm">👎</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(card.id)}
            className="px-2.5 py-1 text-xs rounded-md bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
            title="Gem"
          >
            💾 Gem
          </button>
          <button
            onClick={() => onDismiss(card.id)}
            className="px-2.5 py-1 text-xs rounded-md text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Ignorer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
});

export default PulseCard;
