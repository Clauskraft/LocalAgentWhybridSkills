import { useState, useEffect, useRef, memo } from 'react';
import { IconSend, IconSparkles, IconCode, IconSearch } from './icons';

interface Prediction {
  id: string;
  type: 'action' | 'text' | 'tool';
  content: string;
  confidence: number;
  icon: React.ReactNode;
  action?: () => void;
}

interface PredictiveInterfaceProps {
  input: string;
  messages: any[];
  isLoading: boolean;
  onPredictionSelect: (prediction: Prediction) => void;
}

export const PredictiveInterface = memo(function PredictiveInterface({
  input,
  messages,
  isLoading,
  onPredictionSelect
}: PredictiveInterfaceProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [hoveredPrediction, setHoveredPrediction] = useState<string | null>(null);
  const predictionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // LOOP 8: AI-Powered Predictive Interface
  useEffect(() => {
    // Clear previous timeout
    if (predictionTimeoutRef.current) {
      clearTimeout(predictionTimeoutRef.current);
    }

    if (!input.trim() || input.length < 2) {
      setPredictions([]);
      return;
    }

    // Debounce predictions to avoid too frequent updates
    predictionTimeoutRef.current = setTimeout(() => {
      generatePredictions(input, messages);
    }, 300);

    return () => {
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
    };
  }, [input, messages]);

  // Apply width from data-width attribute to avoid inline styles
  useEffect(() => {
    const bars = document.querySelectorAll('[data-width]');
    bars.forEach((bar) => {
      const width = bar.getAttribute('data-width');
      if (width && bar instanceof HTMLElement) {
        bar.style.width = width;
      }
    });
  }, [predictions]);

  const generatePredictions = async (currentInput: string, messageHistory: any[]) => {
    const newPredictions: Prediction[] = [];

    // Analyze input patterns and context
    const inputLower = currentInput.toLowerCase();
    const lastMessage = messageHistory[messageHistory.length - 1];

    // Code-related predictions
    if (inputLower.includes('code') || inputLower.includes('function') || inputLower.includes('class')) {
      newPredictions.push({
        id: 'code-review',
        type: 'action',
        content: 'Analyze and improve this code',
        confidence: 0.85,
        icon: <IconCode className="w-4 h-4" />,
        action: () => onPredictionSelect({
          id: 'code-review',
          type: 'text',
          content: 'Please analyze this code and suggest improvements:\n\n' + currentInput,
          confidence: 0.85,
          icon: <IconCode className="w-4 h-4" />
        })
      });
    }

    // Search-related predictions
    if (inputLower.includes('search') || inputLower.includes('find') || inputLower.includes('lookup')) {
      newPredictions.push({
        id: 'deep-search',
        type: 'action',
        content: 'Search across knowledge base',
        confidence: 0.78,
        icon: <IconSearch className="w-4 h-4" />,
        action: () => onPredictionSelect({
          id: 'deep-search',
          type: 'text',
          content: 'Search for: ' + currentInput.replace(/search|find|lookup/gi, '').trim(),
          confidence: 0.78,
          icon: <IconSearch className="w-4 h-4" />
        })
      });
    }

    // Follow-up predictions based on conversation context
    if (lastMessage?.role === 'assistant') {
      if (lastMessage.content.includes('error') || lastMessage.content.includes('bug')) {
        newPredictions.push({
          id: 'debug-help',
          type: 'action',
          content: 'Help debug this issue',
          confidence: 0.72,
          icon: <IconSparkles className="w-4 h-4" />,
          action: () => onPredictionSelect({
            id: 'debug-help',
            type: 'text',
            content: 'I need help debugging this issue. The error/message was: ' + lastMessage.content.substring(0, 100) + '...',
            confidence: 0.72,
            icon: <IconSparkles className="w-4 h-4" />
          })
        });
      }
    }

    // Common follow-up actions
    if (messageHistory.length > 2) {
      newPredictions.push({
        id: 'continue-conversation',
        type: 'action',
        content: 'Continue this discussion',
        confidence: 0.65,
        icon: <IconSend className="w-4 h-4" />,
        action: () => onPredictionSelect({
          id: 'continue-conversation',
          type: 'text',
          content: 'Let\'s continue discussing this topic. ' + currentInput,
          confidence: 0.65,
          icon: <IconSend className="w-4 h-4" />
        })
      });
    }

    // Smart text completions
    if (inputLower.startsWith('how')) {
      newPredictions.push({
        id: 'how-to-complete',
        type: 'text',
        content: 'to implement this feature?',
        confidence: 0.55,
        icon: <IconSparkles className="w-4 h-4" />
      });
    } else if (inputLower.startsWith('what')) {
      newPredictions.push({
        id: 'what-is-complete',
        type: 'text',
        content: 'is the best approach for this?',
        confidence: 0.52,
        icon: <IconSparkles className="w-4 h-4" />
      });
    } else if (inputLower.startsWith('why')) {
      newPredictions.push({
        id: 'why-explanation',
        type: 'text',
        content: 'does this happen?',
        confidence: 0.50,
        icon: <IconSparkles className="w-4 h-4" />
      });
    }

    // Sort by confidence and limit to top 3
    newPredictions.sort((a, b) => b.confidence - a.confidence);
    setPredictions(newPredictions.slice(0, 3));
  };

  const handlePredictionClick = (prediction: Prediction) => {
    if (prediction.action) {
      prediction.action();
    } else {
      onPredictionSelect(prediction);
    }
    setPredictions([]);
  };

  if (predictions.length === 0 || isLoading) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-3 p-3 bg-bg-secondary/95 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-slide-up z-40">
      <div className="flex items-center gap-2 mb-3">
        <IconSparkles className="w-3.5 h-3.5 text-accent animate-glow-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Suggested Actions</span>
      </div>

      <div className="space-y-1">
        {predictions.map((prediction) => (
          <button
            key={prediction.id}
            onClick={() => handlePredictionClick(prediction)}
            onMouseEnter={() => setHoveredPrediction(prediction.id)}
            onMouseLeave={() => setHoveredPrediction(null)}
            className={`w-full text-left p-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${hoveredPrediction === prediction.id
              ? 'bg-accent/10 border-accent/20 translate-x-1'
              : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <span className={`p-1.5 rounded-lg ${hoveredPrediction === prediction.id ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted transition-colors'}`}>
                {prediction.icon}
              </span>
              <span className={`text-xs flex-1 truncate ${hoveredPrediction === prediction.id ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                {prediction.content}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${prediction.confidence > 0.8 ? 'bg-success/20 text-success' :
                prediction.confidence > 0.6 ? 'bg-warning/20 text-warning' :
                  'bg-white/10 text-text-muted'
                }`}>
                {(prediction.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-2 w-full bg-white/5 rounded-full h-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${prediction.confidence > 0.8 ? 'bg-success' :
                  prediction.confidence > 0.6 ? 'bg-warning' :
                    'bg-accent'
                  }`}
                data-width={`${prediction.confidence * 100}%`}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
