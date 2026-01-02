import React, { memo, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';

interface Settings {
  ollamaHost: string;
  model: string;
  maxTurns: number;
  systemPrompt: string;
  fullAccess: boolean;
  autoApprove: boolean;
  theme?: string;
  backendUrl?: string;
  useCloud?: boolean;
  safeDirs?: string[];
}

interface SettingsModalProps {
  activeTab: string;
  settings: Settings;
  onTabChange: (tab: string) => void;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onClose: () => void;
}

const TABS = [
  { id: 'general', icon: '⚙️', label: 'Generelt' },
  { id: 'repos', icon: '🗂️', label: 'Repos' },
  { id: 'models', icon: '🤖', label: 'Modeller' },
  { id: 'mcp', icon: '🔌', label: 'MCP Servere' },
  { id: 'prompts', icon: '📝', label: 'System Prompts' },
  { id: 'security', icon: '🔐', label: 'Sikkerhed' },
  { id: 'theme', icon: '🎨', label: 'Theme' },
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-bg-secondary border border-border-primary rounded-2xl w-[700px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between">
          <h2 className="text-lg font-semibold">Indstillinger</h2>
          <button
            onClick={onClose}
            className="text-2xl text-text-muted hover:text-text-primary transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <nav className="w-44 bg-bg-tertiary border-r border-border-primary p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-md text-sm mb-0.5
                  transition-colors flex items-center gap-2
                  ${activeTab === tab.id 
                    ? 'bg-accent text-white' 
                    : 'text-text-secondary hover:bg-bg-hover'}
                `}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <GeneralSettings settings={settings} onUpdate={onUpdateSettings} />
            )}
            {activeTab === 'repos' && (
              <ReposSettings settings={settings} onUpdate={onUpdateSettings} />
            )}
            {activeTab === 'models' && (
              <ModelsSettings settings={settings} onUpdate={onUpdateSettings} />
            )}
            {activeTab === 'mcp' && (
              <MCPSettings />
            )}
            {activeTab === 'prompts' && (
              <PromptsSettings settings={settings} onUpdate={onUpdateSettings} />
            )}
            {activeTab === 'security' && (
              <SecuritySettings settings={settings} onUpdate={onUpdateSettings} />
            )}
            {activeTab === 'theme' && (
              <ThemeSettings settings={settings} onUpdate={onUpdateSettings} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function GeneralSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: Settings; 
  onUpdate: (s: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Ollama Konfiguration">
        <FormGroup label="Ollama Host">
          <input
            type="text"
            value={settings.ollamaHost}
            onChange={(e) => onUpdate({ ollamaHost: e.target.value })}
            className="form-input"
          />
        </FormGroup>
        <FormGroup label="Standard Model (indtast navn)">
          <input
            type="text"
            value={settings.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            placeholder="fx qwen3"
            className="form-input"
          />
        </FormGroup>
      </Section>

      <Section title="Agent Opførsel">
        <FormGroup label="Max samtale-ture">
          <input
            type="number"
            value={settings.maxTurns}
            onChange={(e) => onUpdate({ maxTurns: parseInt(e.target.value) })}
            className="form-input"
          />
        </FormGroup>
      </Section>

      <Section title="Cloud Backend (Railway)">
        <FormGroup label="Backend URL (Railway)">
          <input
            type="text"
            value={settings.backendUrl ?? ''}
            onChange={(e) => onUpdate({ backendUrl: e.target.value })}
            placeholder="https://sca-01-phase3-production.up.railway.app"
            className="form-input"
          />
        </FormGroup>
        <FormGroup label="Foretræk cloud-model">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.useCloud}
              onChange={(e) => onUpdate({ useCloud: e.target.checked })}
              className="w-4 h-4 rounded border-border-primary"
            />
            <span className="text-sm text-text-secondary">Brug Railway-backend som primær</span>
          </label>
        </FormGroup>
      </Section>
    </div>
  );
}

function ReposSettings({
  settings,
  onUpdate
}: {
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
}) {
  const [pathInput, setPathInput] = useState('');
  const safeDirs = settings.safeDirs ?? [];

  const add = () => {
    const next = pathInput.trim();
    if (!next) return;
    const merged = Array.from(new Set([...safeDirs, next]));
    onUpdate({ safeDirs: merged });
    setPathInput('');
  };

  const remove = (p: string) => {
    onUpdate({ safeDirs: safeDirs.filter((x) => x !== p) });
  };

  return (
    <div className="space-y-6">
      <Section title="🗂️ Repos (Safe Dirs)">
        <p className="text-sm text-text-secondary">
          Tilføj repo-roots som agenten må arbejde i, når den kører i “safe mode”.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="C:\\Users\\claus\\Projects\\WidgetDC"
            className="form-input flex-1"
          />
          <button
            onClick={add}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            + Tilføj
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {safeDirs.length === 0 ? (
            <div className="text-sm text-text-muted">Ingen repos tilføjet endnu.</div>
          ) : (
            safeDirs.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between p-3 bg-bg-tertiary border border-border-primary rounded-lg"
              >
                <div className="font-mono text-xs break-all">{p}</div>
                <button
                  onClick={() => remove(p)}
                  className="px-3 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover"
                >
                  Fjern
                </button>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

function ModelsSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: Settings; 
  onUpdate: (s: Partial<Settings>) => void;
}) {
  const [models, setModels] = useState<Array<{ name: string; size: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const api = (window as any).sca01?.chat;
        const list = await api?.getModels?.();
        const parsed = Array.isArray(list)
          ? list
              .filter((m) => m && typeof m.name === 'string')
              .map((m) => ({ name: m.name as string, size: (m.size as string) ?? '' }))
          : [];
        setModels(parsed);
      } catch {
        setModels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <Section title="📦 Installerede Modeller">
        {loading ? (
          <p className="text-text-muted">Henter modeller...</p>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.name}
                className="flex items-center justify-between p-3 bg-bg-tertiary border border-border-primary rounded-lg"
              >
                <div>
                  <div className="font-semibold">{model.name}</div>
                  <div className="text-sm text-text-muted">{model.size}</div>
                </div>
                <button
                  onClick={() => onUpdate({ model: model.name })}
                  className={`px-3 py-1 rounded text-sm ${
                    model.name === settings.model
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary border border-border-primary hover:bg-bg-hover'
                  }`}
                >
                  {model.name === settings.model ? 'Aktiv' : 'Vælg'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function MCPSettings() {
  return (
    <div className="space-y-6">
      <Section title="Konfigurerede MCP Servere">
        <div className="p-3 bg-bg-tertiary border border-border-primary rounded-lg flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <div className="flex-1">
            <div className="font-semibold text-sm">SCA-01 Tools</div>
            <div className="text-xs text-text-muted">stdio • Lokal</div>
          </div>
          <button className="px-2 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover">
            Rediger
          </button>
        </div>
      </Section>

      <Section title="📚 MCP Server Library">
        <p className="text-sm text-text-secondary mb-4">
          Klik på en server for at installere den med ét klik.
        </p>
        <input
          type="text"
          placeholder="🔍 Søg efter servere..."
          className="form-input mb-4"
        />
        <div className="space-y-2">
          {['GitHub', 'Filesystem', 'Puppeteer', 'Notion'].map((name) => (
            <div
              key={name}
              className="p-3 bg-bg-tertiary border border-border-primary rounded-lg flex items-center gap-3 cursor-pointer hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 bg-bg-secondary rounded-lg flex items-center justify-center text-xl">
                {name === 'GitHub' ? '🐙' : name === 'Filesystem' ? '📁' : name === 'Puppeteer' ? '🎭' : '📝'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs text-text-muted">Official MCP server</div>
              </div>
              <button className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-accent-hover">
                + Tilføj
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PromptsSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: Settings; 
  onUpdate: (s: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Aktiv System Prompt">
        <FormGroup label="Vælg Prompt">
          <select className="form-input">
            <option value="default">Standard (The Finisher)</option>
            <option value="coder">Koder-fokus</option>
            <option value="security">Sikkerhedsrevisor</option>
            <option value="custom">Brugerdefineret</option>
          </select>
        </FormGroup>
      </Section>

      <Section title="System Prompt Tekst">
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
          rows={12}
          className="form-input font-mono text-sm"
          placeholder="Indtast system prompt..."
        />
        <button className="mt-3 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
          💾 Gem Prompt
        </button>
      </Section>
    </div>
  );
}

function SecuritySettings({ 
  settings, 
  onUpdate 
}: { 
  settings: Settings; 
  onUpdate: (s: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Adgangskontrol">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.fullAccess}
            onChange={(e) => onUpdate({ fullAccess: e.target.checked })}
            className="w-4 h-4 rounded border-border-primary"
          />
          <span className="text-sm">
            Fuld system-adgang <span className="text-warning">(⚠️ Farligt)</span>
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={settings.autoApprove}
            onChange={(e) => onUpdate({ autoApprove: e.target.checked })}
            className="w-4 h-4 rounded border-border-primary"
          />
          <span className="text-sm">
            Auto-godkend alle operationer <span className="text-warning">(⚠️ Farligt)</span>
          </span>
        </label>
      </Section>

      <Section title="Blokerede Stier">
        <textarea
          defaultValue={`.git\nnode_modules\n.env`}
          rows={4}
          className="form-input font-mono text-sm"
        />
      </Section>

      <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
        💾 Gem Sikkerhed
      </button>
    </div>
  );
}

function ThemeSettings({
  settings,
  onUpdate
}: {
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
}) {
  const themes = [
    { id: 'dark', label: 'Dark (default)' },
    { id: 'light', label: 'Light' },
    { id: 'tdc-blue', label: 'TDC Blue' },
    { id: 'tdc-purple', label: 'TDC Purple' },
  ];

  return (
    <div className="space-y-6">
      <Section title="Theme">
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => onUpdate({ theme: t.id })}
              className={`p-3 border rounded-lg text-left transition-colors ${
                settings.theme === t.id
                  ? 'border-accent bg-bg-tertiary'
                  : 'border-border-primary hover:border-accent'
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-sm text-text-muted">{t.id}</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-accent mb-4">{title}</h3>
      {children}
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: ReactNode }) {
  const fallbackId = useId();

  const enhancedChild = (() => {
    if (!React.isValidElement(children)) return children;

    const props = children.props as Record<string, unknown>;
    const existingId = typeof props.id === "string" ? props.id : undefined;

    const nextProps: Record<string, unknown> = {
      ...props,
      id: existingId ?? fallbackId,
      "aria-label": typeof props["aria-label"] === "string" ? props["aria-label"] : label,
    };

    return React.cloneElement(children, nextProps);
  })();

  const childId = React.isValidElement(enhancedChild)
    ? (enhancedChild.props as Record<string, unknown>).id
    : undefined;

  return (
    <div className="mb-4">
      <label htmlFor={typeof childId === "string" ? childId : fallbackId} className="block text-sm text-text-secondary mb-2">
        {label}
      </label>
      {enhancedChild}
    </div>
  );
}

// Add form-input styles via CSS (Tailwind utility in index.css or inline)
// For now, we'll use inline classes in the form-input usage above

