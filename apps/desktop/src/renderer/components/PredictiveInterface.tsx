import { useState, useEffect, useRef, memo } from 'react';
import { IconSend } from './icons';

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
  const predictionTimeoutRef = useRef<NodeJS.Timeout>();

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
    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <IconSparkles className="w-4 h-4 text-accent animate-glow-pulse" />
        <span className="text-xs font-medium text-text-primary">Predictions</span>
      </div>

      <div className="space-y-1">
        {predictions.map((prediction) => (
          <button
            key={prediction.id}
            onClick={() => handlePredictionClick(prediction)}
            onMouseEnter={() => setHoveredPrediction(prediction.id)}
            onMouseLeave={() => setHoveredPrediction(null)}
            className={`w-full text-left p-2 rounded-lg transition-all duration-200 group ${
              hoveredPrediction === prediction.id
                ? 'bg-accent/20 shadow-lg transform scale-105'
                : 'bg-bg-tertiary/50 hover:bg-accent/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={hoveredPrediction === prediction.id ? 'text-accent' : 'text-text-secondary'}>
                {prediction.icon}
              </span>
              <span className={`text-sm flex-1 ${hoveredPrediction === prediction.id ? 'text-accent font-medium' : 'text-text-primary'}`}>
                {prediction.content}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                prediction.confidence > 0.8 ? 'bg-success/20 text-success' :
                prediction.confidence > 0.6 ? 'bg-warning/20 text-warning' :
                'bg-bg-tertiary text-text-muted'
              }`}>
                {(prediction.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-1 w-full bg-bg-tertiary rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  prediction.confidence > 0.8 ? 'bg-success' :
                  prediction.confidence > 0.6 ? 'bg-warning' :
                  'bg-accent'
                }`}
                style={{ width: `${prediction.confidence * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
