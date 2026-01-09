import React, { memo, useEffect, useState } from 'react';
import { IconSettings, IconShield, IconBolt, IconPlug, IconPulse, IconX } from './icons';
import { UISettings } from '../hooks/useSettings';
import { ModelsSettings } from './settings/ModelsSettings';
import { MCPSettings } from './settings/MCPSettings';

interface SettingsModalProps {
  activeTab: string;
  settings: UISettings | any;
  onTabChange: (tab: string) => void;
  onUpdateSettings: (settings: Partial<any>) => void;
  onClose: () => void;
  resetToDefaults: () => void;
}

const TABS = [
  { id: 'general', icon: <IconSettings className="w-4 h-4" />, label: 'Generelt' },
  { id: 'models', icon: <IconBolt className="w-4 h-4" />, label: 'Modeller' },
  { id: 'system', icon: <IconShield className="w-4 h-4" />, label: 'System' },
  { id: 'mcp', icon: <IconPlug className="w-4 h-4" />, label: 'MCP Servere' },
  { id: 'pulse', icon: <IconPulse className="w-4 h-4" />, label: 'Pulse+' },
];

export const SettingsModal = memo(function SettingsModal({
  activeTab,
  settings,
  onTabChange,
  onUpdateSettings,
  onClose,
  resetToDefaults,
}: SettingsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in px-4">
      <div className="bg-bg-secondary border border-white/10 rounded-3xl w-[850px] max-w-full h-[650px] max-h-[90vh] overflow-hidden flex shadow-[0_30px_100px_rgba(0,0,0,0.6)] animate-slide-up">
        {/* Sidebar */}
        <nav className="w-64 bg-white/5 border-r border-white/5 p-6 flex flex-col gap-2">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-bold text-text-primary">Indstillinger</h2>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">SCA-01 Control Panel</p>
          </div>

          <div className="flex-1 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-300 flex items-center gap-3 group
                  ${activeTab === tab.id
                    ? 'bg-accent/10 text-accent shadow-[0_0_20px_rgba(226,0,116,0.1)]'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
                `}
              >
                <span className={`transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? "text-accent" : "text-text-muted"}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-auto flex items-center gap-2 px-4 py-3 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <IconX className="w-4 h-4" /> Luk Indstillinger
          </button>
        </nav>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg-primary/50">
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {activeTab === 'general' && (
              <div className="space-y-10 animate-fade-in">
                <header>
                  <h3 className="text-2xl font-bold text-text-primary mb-2">System Konfiguration</h3>
                  <p className="text-sm text-text-muted">Administrer de grundlæggende parametre for din AI-agent.</p>
                </header>

                <div className="space-y-8">
                  <SettingField
                    label="Maksimalt antal runder"
                    description="Hvor mange gange må agenten køre i træk for at løse en opgave?"
                  >
                    <input
                      type="number"
                      value={settings.maxTurns}
                      onChange={(e) => onUpdateSettings({ maxTurns: parseInt(e.target.value) || 1 })}
                      className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-accent outline-none transition-all"
                    />
                  </SettingField>

                  <SettingField
                    label="Ollama Host"
                    description="Adressen på din lokale Ollama server (standard: http://localhost:11434)."
                  >
                    <input
                      type="text"
                      value={settings.ollamaHost}
                      onChange={(e) => onUpdateSettings({ ollamaHost: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-accent outline-none transition-all"
                    />
                  </SettingField>

                  <SettingField
                    label="Holografisk Interface"
                    description="Aktiver avancerede visuelle effekter og shimmer-animationer."
                  >
                    <div className="flex items-center h-10">
                      <div className="w-12 h-6 rounded-full bg-accent/20 border border-accent/40 relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-accent shadow-[0_0_10px_rgba(226,0,116,0.5)]" />
                      </div>
                    </div>
                  </SettingField>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="animate-fade-in">
                <ModelsSettings settings={settings} onUpdate={onUpdateSettings} />
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="animate-fade-in">
                <MCPSettings />
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8 animate-fade-in">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
                    <IconShield className="w-3.5 h-3.5" /> System Control
                  </h3>
                  <div className="glass-card p-8 rounded-[2rem] border-error/10 bg-error/5">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                        <IconTrash className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black uppercase tracking-wider text-text-primary mb-1">Restore Factory Defaults</h4>
                        <p className="text-xs text-text-muted">Nulstil alle temaer, model-parametre og system-indstillinger til deres standardværdier. Dine chats slettes ikke.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Er du sikker på du vil nulstille alle indstillinger?')) {
                            resetToDefaults();
                            onClose();
                          }
                        }}
                        className="px-6 py-3 bg-error text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-error/80 transition-all shadow-lg shadow-error/20"
                      >
                        Nulstil
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Environment Diagnostics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 glass-card rounded-2xl border-white/5">
                      <div className="text-[10px] text-text-muted uppercase font-bold text-[10px] mb-1">Architecture</div>
                      <div className="text-xs font-mono text-accent">X64_HYBRID_NEURAL</div>
                    </div>
                    <div className="p-4 glass-card rounded-2xl border-white/5">
                      <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Registry State</div>
                      <div className="text-xs font-mono text-success">STABLE</div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Placeholder for other tabs */}
            {!['general', 'models', 'mcp', 'system'].includes(activeTab) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-accent mb-6">
                  <IconPulse className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">{TABS.find(t => t.id === activeTab)?.label} kommer snart</h3>
                <p className="text-sm text-text-muted max-w-xs">Vi arbejder på at færdiggøre denne sektion i den næste optimerings-cyklus.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function SettingField({ label, description, children }: { label: string, description: string, children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-12">
      <div className="flex-1">
        <div className="text-sm font-bold text-text-primary mb-1">{label}</div>
        <div className="text-xs text-text-muted leading-relaxed">{description}</div>
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );
}
