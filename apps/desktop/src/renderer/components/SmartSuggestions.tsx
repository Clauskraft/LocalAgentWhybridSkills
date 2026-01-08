import { useState, useEffect, memo } from 'react';
import { IconSparkles, IconSearch, IconLightbulb, IconCode } from './icons';
// Icons available if needed: IconBolt, IconSettings, IconPlug, IconCircle

interface SmartSuggestionsProps {
  input: string;
  onSuggestionClick: (suggestion: string) => void;
  isLoading: boolean;
}

export const SmartSuggestions = memo(function SmartSuggestions({
  input,
  onSuggestionClick,
  isLoading
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // LOOP 3: AI-Powered Smart Suggestions
  useEffect(() => {
    if (!input.trim() || input.length < 3) {
      setSuggestions([]);
      return;
    }

    const generateSuggestions = async () => {
      setIsGenerating(true);
      try {
        // Simulate AI suggestion generation (replace with actual AI call)
        const mockSuggestions = await new Promise<string[]>((resolve) => {
          setTimeout(() => {
            const baseSuggestions = [
              "🔍 Analyze this code and explain what it does",
              "💡 Suggest improvements for this implementation",
              "🧪 Write unit tests for this function",
              "📝 Generate documentation comments",
              "🔧 Refactor this code for better performance",
              "🎨 Improve the UI/UX design",
              "🔒 Add security validations",
              "⚡ Optimize for better performance"
            ];

            // Filter and customize based on input
            const filtered = baseSuggestions.filter(s =>
              s.toLowerCase().includes(input.toLowerCase().split(' ')[0]) ||
              Math.random() > 0.5 // Add some randomness
            ).slice(0, 4);

            resolve(filtered);
          }, 300 + Math.random() * 200); // Simulate AI processing time
        });

        setSuggestions(mockSuggestions);
      } catch (error) {
        console.error('Failed to generate suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSuggestions();
  }, [input]);

  if (suggestions.length === 0 && !isGenerating) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <IconSparkles className="w-4 h-4 text-accent animate-glow-pulse" />
        <span className="text-sm font-medium text-text-primary">AI Suggestions</span>
        {isGenerating && (
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isLoading}
            className="group flex items-center gap-3 p-3 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 hover:from-accent/10 hover:to-accent/5 border border-border-primary/30 hover:border-accent/30 rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex-shrink-0">
              {suggestion.includes('🔍') && <IconSearch className="w-4 h-4 text-accent" />}
              {suggestion.includes('💡') && <IconLightbulb className="w-4 h-4 text-accent" />}
              {suggestion.includes('🧪') && <IconCode className="w-4 h-4 text-accent" />}
              {suggestion.includes('📝') && <IconSparkles className="w-4 h-4 text-accent" />}
            </div>
            <span className="text-sm text-text-primary text-left group-hover:text-accent transition-colors">
              {suggestion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
