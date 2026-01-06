/**
 * PulseCurate Component
 *
 * Dialog til at tilføje kurateringsønsker til morgendagens Pulse.
 * Brugeren kan angive emner, de vil have research om.
 */

import { memo, useState, useCallback } from 'react';

interface PulseCurateProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (topic: string) => Promise<void>;
}

// Suggested topics for quick selection
const SUGGESTED_TOPICS = [
  { label: 'NIS2 opdateringer', category: 'THREAT' },
  { label: 'Nye AI-modeller', category: 'AI_INSIGHT' },
  { label: 'Cloud migration trends', category: 'BUSINESS' },
  { label: 'CVE denne uge', category: 'THREAT' },
  { label: 'EU AI Act status', category: 'BUSINESS' },
  { label: 'LLM sikkerhed', category: 'AI_INSIGHT' },
];

export const PulseCurate = memo(function PulseCurate({
  isOpen,
  onClose,
  onSubmit,
}: PulseCurateProps) {
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(topic.trim());
      setSubmitted(true);
      setTopic('');

      // Auto-close after showing success
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[PulseCurate] Failed to submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [topic, onSubmit, onClose]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setTopic(suggestion);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-bg-secondary rounded-xl border border-border-primary shadow-2xl overflow-hidden">
        {/* Success State */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">✅</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Ønske tilføjet!
            </h2>
            <p className="text-sm text-text-muted">
              Vi vil forsøge at finde relevant indhold til morgendagens Pulse.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-primary">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <span>🎯</span>
                  Kuratér Morgendagens Pulse
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-text-muted mt-1">
                Fortæl os, hvad du vil have research om i morgen
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Topic Input */}
              <div className="mb-4">
                <label
                  htmlFor="curation-topic"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Emne eller spørgsmål
                </label>
                <textarea
                  id="curation-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="F.eks. 'Opdater mig på NIS2-guidelines' eller 'Nye AI-sikkerhedsværktøjer'"
                  className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg
                    text-text-primary placeholder:text-text-muted
                    focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                    resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-text-muted">
                    {topic.length}/200
                  </span>
                </div>
              </div>

              {/* Suggested Topics */}
              <div className="mb-6">
                <span className="block text-xs font-medium text-text-muted mb-2">
                  Forslag:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TOPICS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion.label)}
                      className={`
                        px-2.5 py-1 text-xs rounded-lg transition-colors
                        ${topic === suggestion.label
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-white/5 text-text-secondary hover:bg-white/10 border border-transparent'}
                      `}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={!topic.trim() || isSubmitting}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${topic.trim() && !isSubmitting
                      ? 'bg-accent text-white hover:bg-accent/80'
                      : 'bg-accent/20 text-accent/50 cursor-not-allowed'}
                  `}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">↻</span>
                      Tilføjer...
                    </span>
                  ) : (
                    'Tilføj ønske'
                  )}
                </button>
              </div>
            </form>

            {/* Info Footer */}
            <div className="px-6 py-3 bg-bg-primary/50 border-t border-border-primary">
              <p className="text-xs text-text-muted text-center">
                💡 Ønsker skal tilføjes før kl. 22:00 for at indgå i morgendagens Pulse
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default PulseCurate;
