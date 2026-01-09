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
      <h1 className="text-3xl font-semibold mb-2">@dot</h1>

      {/* Subtitle */}
      <p className="text-text-secondary mb-4">
        Din lokale AI-agent med enterprise-grade sikkerhed og fuld PC-adgang
      </p>

      {/* Certification Badge */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/20 mb-12 animate-fade-in shadow-lg shadow-accent/5">
        <IconShield className="w-3 h-3 text-accent" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/80">@dot STABILIZATION COMPLETE • JANUARY 2026</span>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
        {quickActions.map((action, i) => (
          <button
            key={action.title}
            onClick={() => onQuickStart(action.prompt)}
            className="group relative p-6 glass-card rounded-3xl text-left hover:border-accent/40 transition-all duration-500 shadow-2xl hover:shadow-accent/5 active:scale-95 animate-slide-up"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500 holographic-glow">
              {action.icon}
            </div>
            <div className="font-bold text-base mb-2 text-text-primary group-hover:text-accent transition-colors">
              {action.title}
            </div>
            <div className="text-xs text-text-muted leading-loose opacity-70 group-hover:opacity-100 transition-opacity">
              {action.description}
            </div>

            {/* Subtle interactive glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:to-transparent transition-all duration-500 rounded-3xl pointer-events-none" />
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

