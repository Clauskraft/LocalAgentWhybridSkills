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
    <div className="absolute bottom-full left-0 right-0 mb-4 p-4 glass-card rounded-2xl animate-slide-up border-accent/20">
      <div className="flex items-center gap-2 mb-3">
        <IconSparkles className="w-4 h-4 text-accent animate-pulse holographic-glow" />
        <span className="text-xs font-bold uppercase tracking-widest text-text-primary">AI Suggestions</span>
        {isGenerating && (
          <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin ml-auto" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isLoading}
            className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-accent/10 border border-white/5 hover:border-accent/30 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 active:scale-95"
          >
            <div className="flex-shrink-0 transition-transform group-hover:scale-110">
              {suggestion.includes('🔍') && <IconSearch className="w-4 h-4 text-accent" />}
              {suggestion.includes('💡') && <IconLightbulb className="w-4 h-4 text-accent" />}
              {suggestion.includes('🧪') && <IconCode className="w-4 h-4 text-accent" />}
              {suggestion.includes('📝') && <IconSparkles className="w-4 h-4 text-accent" />}
            </div>
            <span className="text-xs font-medium text-text-secondary text-left group-hover:text-text-primary transition-colors">
              {suggestion}
            </span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <IconSparkles className="w-3 h-3 text-accent" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
