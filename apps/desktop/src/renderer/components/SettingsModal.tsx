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
}

const TABS = [
  { id: 'general', icon: <IconSettings className="w-4 h-4" />, label: 'Generelt' },
  { id: 'models', icon: <IconBolt className="w-4 h-4" />, label: 'Modeller' },
  { id: 'security', icon: <IconShield className="w-4 h-4" />, label: 'Sikkerhed' },
  { id: 'mcp', icon: <IconPlug className="w-4 h-4" />, label: 'MCP Servere' },
  { id: 'pulse', icon: <IconPulse className="w-4 h-4" />, label: 'Pulse+' },
];

export const SettingsModal = memo(function SettingsModal({
  activeTab,
  settings,
  onTabChange,
  onUpdateSettings,
  onClose,
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

            {/* Placeholder for other tabs */}
            {!['general', 'models', 'mcp'].includes(activeTab) && (
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
