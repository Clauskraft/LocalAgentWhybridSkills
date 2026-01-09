import { memo } from 'react';
import { IconBolt, IconChat, IconPlug, IconPlus, IconSettings } from './icons';

interface WelcomeScreenProps {
  onQuickStart: (prompt: string) => void;
}

export const WelcomeScreen = memo(function WelcomeScreen({ onQuickStart }: WelcomeScreenProps) {
  const quickActions: Array<{ icon: React.ReactNode; title: string; description: string; prompt: string }> = [
    {
      icon: <IconSettings className="w-5 h-5" />,
      title: 'Læs Blackboard',
      description: 'Tjek HANDOVER_LOG status',
      prompt: 'Læs docs/HANDOVER_LOG.md og giv mig en status',
    },
    {
      icon: <IconPlug className="w-5 h-5" />,
      title: 'List filer',
      description: 'Se indholdet af mappen',
      prompt: 'List filer i denne mappe',
    },
    {
      icon: <IconChat className="w-5 h-5" />,
      title: 'Kør tests',
      description: 'Eksekver test suite',
      prompt: 'Kør make test og vis resultatet',
    },
    {
      icon: <IconPlus className="w-5 h-5" />,
      title: 'Hvad kan du?',
      description: 'Se capabilities',
      prompt: 'Hvad kan du hjælpe mig med?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Logo */}
      <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-accent/20 via-bg-secondary to-bg-tertiary border border-white/10 flex items-center justify-center mb-6 text-accent shadow-[0_0_30px_rgba(226,0,116,0.15)] animate-morphing-blob">
        <IconBolt className="w-8 h-8 animate-glow-pulse" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-semibold mb-2">SCA-01 The Finisher</h1>

      {/* Subtitle */}
      <p className="text-text-secondary mb-8">
        Din lokale AI-agent med enterprise-grade sikkerhed og fuld PC-adgang
      </p>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-xl w-full">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={() => onQuickStart(action.prompt)}
            className="p-4 bg-bg-secondary border border-border-primary rounded-xl text-left hover:border-border-secondary hover:bg-bg-tertiary transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-primary flex items-center justify-center text-text-secondary mb-3 group-hover:text-text-primary group-hover:border-border-secondary transition-colors">
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
          <kbd className="kbd">Ctrl+N</kbd> Ny chat
        </span>
        <span>
          <kbd className="kbd">Ctrl+/</kbd> Fokus input
        </span>
        <span>
          <kbd className="kbd">Ctrl+,</kbd> Indstillinger
        </span>
      </div>
    </div>
  );
});

