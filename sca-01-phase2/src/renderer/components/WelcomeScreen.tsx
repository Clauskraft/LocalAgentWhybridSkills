import { memo } from 'react';

interface WelcomeScreenProps {
  onQuickStart: (prompt: string) => void;
}

export const WelcomeScreen = memo(function WelcomeScreen({ onQuickStart }: WelcomeScreenProps) {
  const quickActions = [
    {
      icon: '📋',
      title: 'Læs Blackboard',
      description: 'Tjek HANDOVER_LOG status',
      prompt: 'Læs docs/HANDOVER_LOG.md og giv mig en status',
    },
    {
      icon: '📁',
      title: 'List filer',
      description: 'Se indholdet af mappen',
      prompt: 'List filer i denne mappe',
    },
    {
      icon: '🧪',
      title: 'Kør tests',
      description: 'Eksekver test suite',
      prompt: 'Kør make test og vis resultatet',
    },
    {
      icon: '❓',
      title: 'Hvad kan du?',
      description: 'Se capabilities',
      prompt: 'Hvad kan du hjælpe mig med?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Logo */}
      <div className="text-6xl mb-4">⚡</div>
      
      {/* Title */}
      <h1 className="text-3xl font-bold mb-2 text-gradient">
        SCA-01 "The Finisher"
      </h1>
      
      {/* Subtitle */}
      <p className="text-text-secondary mb-8">
        Din lokale AI-agent med fuld PC-adgang
      </p>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-xl w-full">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={() => onQuickStart(action.prompt)}
            className="p-4 bg-bg-secondary border border-border-primary rounded-xl text-left hover:border-accent hover:bg-bg-tertiary transition-all group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
              {action.icon}
            </div>
            <div className="font-semibold mb-1">{action.title}</div>
            <div className="text-sm text-text-secondary">{action.description}</div>
          </button>
        ))}
      </div>

      {/* Keyboard Hints */}
      <div className="mt-8 flex gap-6 text-sm text-text-muted">
        <span>
          <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs">Ctrl+N</kbd> Ny chat
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs">Ctrl+/</kbd> Fokus input
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs">Ctrl+,</kbd> Indstillinger
        </span>
      </div>
    </div>
  );
});

