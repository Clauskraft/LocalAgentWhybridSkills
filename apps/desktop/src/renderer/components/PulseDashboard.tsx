/**
 * PulseDashboard Component
 *
 * Hovedvisning for Pulse+ daglig briefing.
 * Viser dagens kort i kategori-grupper eller som samlet liste.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { PulseCard } from './PulseCard';

// Types (inline for renderer isolation)
type PulseCategory = 'THREAT' | 'AI_INSIGHT' | 'BUSINESS' | 'ACTIVITY' | 'PERSONAL' | 'FAMILY';
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
  status: string;
}

interface PulseDashboardProps {
  onBack?: () => void;
}

// Category config for tabs
const CATEGORIES: { key: PulseCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Alle', emoji: '📋' },
  { key: 'PERSONAL', label: 'Personlig', emoji: '🧠' },
  { key: 'FAMILY', label: 'Familie', emoji: '👨‍👩‍👧‍👦' },
  { key: 'THREAT', label: 'Sikkerhed', emoji: '🔴' },
  { key: 'AI_INSIGHT', label: 'AI', emoji: '🟣' },
  { key: 'BUSINESS', label: 'Forretning', emoji: '🟡' },
  { key: 'ACTIVITY', label: 'Aktivitet', emoji: '🔵' },
];

export const PulseDashboard = memo(function PulseDashboard({ onBack }: PulseDashboardProps) {
  const [cards, setCards] = useState<PulseCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PulseCategory | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  // Load cards from backend
  const loadCards = useCallback(async () => {
    try {
      const result = await window.electronAPI?.pulse?.getTodayCards?.();
      if (result?.success && result.data) {
        setCards(result.data);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Kunne ikke hente Pulse data');
      console.error('[PulseDashboard] Failed to load cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh/generate new digest
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await window.electronAPI?.pulse?.generateDigest?.();
      if (result?.success) {
        await loadCards();
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Kunne ikke generere ny Pulse');
      console.error('[PulseDashboard] Failed to refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCards]);

  // Initial load
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Card actions
  const handleFeedback = useCallback(async (cardId: string, feedback: 'up' | 'down') => {
    try {
      await window.electronAPI?.pulse?.submitFeedback?.(cardId, feedback);
      setCards(prev =>
        prev.map(card =>
          card.id === cardId ? { ...card, feedback } : card
        )
      );
    } catch (err) {
      console.error('[PulseDashboard] Failed to submit feedback:', err);
    }
  }, []);

  const handleSave = useCallback(async (cardId: string) => {
    try {
      await window.electronAPI?.pulse?.saveCard?.(cardId);
      setCards(prev =>
        prev.map(card =>
          card.id === cardId ? { ...card, status: 'saved' } : card
        )
      );
    } catch (err) {
      console.error('[PulseDashboard] Failed to save card:', err);
    }
  }, []);

  const handleDismiss = useCallback(async (cardId: string) => {
    try {
      await window.electronAPI?.pulse?.dismissCard?.(cardId);
      setCards(prev => prev.filter(card => card.id !== cardId));
    } catch (err) {
      console.error('[PulseDashboard] Failed to dismiss card:', err);
    }
  }, []);

  const handleOpenSource = useCallback((url: string) => {
    window.electronAPI?.shell?.openExternal?.(url);
  }, []);

  // Filter cards by category
  const filteredCards = selectedCategory === 'all'
    ? cards
    : cards.filter(card => card.category === selectedCategory);

  // Count by category
  const categoryCounts = cards.reduce((acc, card) => {
    acc[card.category] = (acc[card.category] || 0) + 1;
    return acc;
  }, {} as Record<PulseCategory, number>);

  const formatDate = () => {
    return new Date().toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="Tilbage"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Pulse+ Daglig Briefing
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                {formatDate()} • {cards.length} indsigter
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
              ${isRefreshing
                ? 'bg-accent/20 text-accent cursor-wait'
                : 'bg-accent/10 text-accent hover:bg-accent/20'}
            `}
          >
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">↻</span>
                Genererer...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ↻ Opdater
              </span>
            )}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all'
              ? cards.length
              : (categoryCounts[cat.key as PulseCategory] || 0);

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${selectedCategory === cat.key
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}
                `}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-xs
                    ${selectedCategory === cat.key ? 'bg-accent/30' : 'bg-white/10'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">⚡</div>
              <p className="text-text-muted">Henter dagens indsigter...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
              >
                Prøv igen
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredCards.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-text-muted mb-2">
                {selectedCategory === 'all'
                  ? 'Ingen indsigter endnu'
                  : `Ingen ${CATEGORIES.find(c => c.key === selectedCategory)?.label.toLowerCase()} indsigter`}
              </p>
              <p className="text-sm text-text-muted mb-4">
                Klik "Opdater" for at generere din daglige briefing
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
              >
                Generer Pulse
              </button>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && !error && filteredCards.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map(card => (
                <PulseCard
                  key={card.id}
                  card={card}
                  onFeedback={handleFeedback}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                  onOpenSource={handleOpenSource}
                />
              ))}
            </div>

            {/* End Message */}
            {filteredCards.length >= 3 && (
              <div className="text-center py-8 mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary/50 text-text-muted text-sm">
                  <span>✨</span>
                  <span>Det var dagens Pulse briefing</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
});

export default PulseDashboard;
