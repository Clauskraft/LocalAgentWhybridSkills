import React, { memo, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';

import { MCP_SERVER_CATALOG } from '../../mcp/serverCatalog';
import { IconBolt, IconPlug, IconSettings, IconShield, IconX } from './icons';

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
  { id: 'general', icon: <IconSettings className="w-4 h-4" />, label: 'Generelt' },
  { id: 'repos', icon: <IconShield className="w-4 h-4" />, label: 'Repos' },
  { id: 'models', icon: <IconBolt className="w-4 h-4" />, label: 'Modeller' },
  { id: 'mcp', icon: <IconPlug className="w-4 h-4" />, label: 'MCP Servere' },
  { id: 'prompts', icon: <IconSettings className="w-4 h-4" />, label: 'System Prompts' },
  { id: 'security', icon: <IconShield className="w-4 h-4" />, label: 'Sikkerhed' },
  { id: 'perf', icon: <IconBolt className="w-4 h-4" />, label: 'Performance' },
  { id: 'theme', icon: <IconSettings className="w-4 h-4" />, label: 'Theme' },
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-bg-secondary border border-border-primary rounded-2xl w-[700px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between">
          <h2 className="text-lg font-semibold">Indstillinger</h2>
          <button
            onClick={onClose}
            className="icon-btn w-9 h-9"
            aria-label="Luk"
          >
            <IconX className="w-4 h-4" />
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
                    ? 'bg-bg-active text-text-primary border border-border-secondary'
                    : 'text-text-secondary hover:bg-bg-hover'}
                `}
              >
                <span className={activeTab === tab.id ? "text-accent" : "text-text-muted"}>{tab.icon}</span>
                {tab.label}
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
            {activeTab === 'perf' && (
              <PerformanceSettings />
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

function PerformanceSettings() {
  const [latest, setLatest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const perf = (window as any).sca01?.perf;
        if (!perf?.getStats) {
          setError("Perf IPC not available");
          return;
        }
        const res = await perf.getStats();
        if (!alive) return;
        setLatest(res?.latest ?? null);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Section title="Performance (lokal sampler)">
        <p className="text-sm text-text-secondary">
          Opdateres hvert sekund. Brug dette til at spotte RAM/CPU/event-loop leaks over tid.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!latest ? (
          <p className="text-sm text-text-muted">Ingen data endnu…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
              <div className="text-text-muted">RSS</div>
              <div className="text-text-primary font-semibold">{latest.rssMB} MB</div>
            </div>
            <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
              <div className="text-text-muted">Heap used</div>
              <div className="text-text-primary font-semibold">{latest.heapUsedMB} / {latest.heapTotalMB} MB</div>
            </div>
            <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
              <div className="text-text-muted">CPU (Δ/1s)</div>
              <div className="text-text-primary font-semibold">{latest.cpuUserMs}ms user / {latest.cpuSystemMs}ms sys</div>
            </div>
            <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
              <div className="text-text-muted">Event loop lag</div>
              <div className="text-text-primary font-semibold">
                p50 {latest.eventLoopLagP50Ms ?? "—"}ms · p95 {latest.eventLoopLagP95Ms ?? "—"}ms · p99 {latest.eventLoopLagP99Ms ?? "—"}ms
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-text-muted mt-2">
          Tip: åbne DevTools console og kør <code className="font-mono">window.sca01.perf.getStats()</code> for fuld buffer.
        </p>
      </Section>
    </div>
  );
}

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
            aria-label="Ollama Host"
            className="form-input"
          />
        </FormGroup>
        <FormGroup label="Standard Model (indtast navn)">
          <input
            type="text"
            value={settings.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            placeholder="fx qwen3"
            aria-label="Standard Model"
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
            aria-label="Max samtale-ture"
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
            placeholder="https://backend-production-d3da.up.railway.app"
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
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [cloudStatus, setCloudStatus] = useState<{
    backendUrl: string;
    encryptionAvailable: boolean;
    loggedIn: boolean;
  } | null>(null);
  const [cloudRepos, setCloudRepos] = useState<Array<{
    id: string;
    name: string;
    remoteUrl?: string | null;
    defaultBranch?: string | null;
    isArchived?: boolean;
  }>>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [newCloudRepoName, setNewCloudRepoName] = useState("");
  const [newCloudRepoRemoteUrl, setNewCloudRepoRemoteUrl] = useState("");
  const [newCloudRepoBranch, setNewCloudRepoBranch] = useState("main");

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

  const refreshCloud = async () => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const api = (window as any).sca01?.cloud;
      if (!api?.status) throw new Error("Cloud IPC not available");
      const st = await api.status();
      setCloudStatus(st);
      if (!st.backendUrl?.trim()) {
        setCloudRepos([]);
        return;
      }
      if (st.loggedIn) {
        const res = await api.listRepos?.({ includeArchived: false });
        const repos = Array.isArray(res?.repos) ? res.repos : [];
        setCloudRepos(
          repos
            .filter((r: any) => r && typeof r.id === "string" && typeof r.name === "string")
            .map((r: any) => ({
              id: r.id as string,
              name: r.name as string,
              remoteUrl: (r.remoteUrl as string) ?? null,
              defaultBranch: (r.defaultBranch as string) ?? null,
              isArchived: (r.isArchived as boolean) ?? false,
            }))
        );
      } else {
        setCloudRepos([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCloudError(msg);
    } finally {
      setCloudLoading(false);
    }
  };

  const loginCloud = async () => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const api = (window as any).sca01?.cloud;
      if (!api?.login) throw new Error("Cloud IPC not available");
      await api.login({ email: cloudEmail.trim(), password: cloudPassword });
      setCloudPassword("");
      await refreshCloud();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCloudError(msg);
    } finally {
      setCloudLoading(false);
    }
  };

  const logoutCloud = async () => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const api = (window as any).sca01?.cloud;
      await api.logout?.();
      setCloudRepos([]);
      await refreshCloud();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCloudError(msg);
    } finally {
      setCloudLoading(false);
    }
  };

  const createCloudRepo = async () => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const api = (window as any).sca01?.cloud;
      if (!api?.createRepo) throw new Error("Cloud IPC not available");
      const name = newCloudRepoName.trim();
      if (!name) throw new Error("Repo name is required");
      const remoteUrl = newCloudRepoRemoteUrl.trim();
      const defaultBranch = newCloudRepoBranch.trim();
      await api.createRepo({
        name,
        remoteUrl: remoteUrl ? remoteUrl : null,
        defaultBranch: defaultBranch ? defaultBranch : null,
        policy: { allowRead: true, allowWrite: false, allowExec: false, allowNetwork: true },
      });
      setNewCloudRepoName("");
      setNewCloudRepoRemoteUrl("");
      setNewCloudRepoBranch("main");
      await refreshCloud();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCloudError(msg);
    } finally {
      setCloudLoading(false);
    }
  };

  const archiveCloudRepo = async (id: string) => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const api = (window as any).sca01?.cloud;
      await api.archiveRepo?.({ id });
      await refreshCloud();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCloudError(msg);
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    refreshCloud();
  }, [settings.backendUrl]);

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

      <Section title="☁️ Cloud Repo Catalog (Railway)">
        <p className="text-sm text-text-secondary">
          Bruger din Phase 3 backend til at gemme repos og policy per bruger/device. Tokens bliver gemt krypteret i OS-keychain via Electron.
        </p>

        {cloudError ? (
          <div className="p-3 rounded border border-border-primary bg-bg-tertiary text-sm text-warning">
            {cloudError}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-text-muted">
            Backend: <span className="font-mono">{(cloudStatus?.backendUrl ?? settings.backendUrl ?? "").trim() || "(ikke sat)"}</span>
          </div>
          <button
            onClick={refreshCloud}
            className="px-3 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover"
            disabled={cloudLoading}
          >
            Opdatér
          </button>
        </div>

        {!cloudStatus?.encryptionAvailable ? (
          <div className="p-3 rounded border border-border-primary bg-bg-tertiary text-sm text-warning">
            OS encryption er ikke tilgængelig. Cloud login er deaktiveret.
          </div>
        ) : (
          <div className="space-y-3">
            {!cloudStatus?.loggedIn ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
                  placeholder="email"
                  className="form-input"
                />
                <input
                  type="password"
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  placeholder="password"
                  className="form-input"
                />
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={loginCloud}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                    disabled={cloudLoading}
                  >
                    Log ind
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-success">Logget ind</div>
                <button
                  onClick={logoutCloud}
                  className="px-3 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover"
                  disabled={cloudLoading}
                >
                  Log ud
                </button>
              </div>
            )}
          </div>
        )}

        {cloudStatus?.loggedIn ? (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newCloudRepoName}
                onChange={(e) => setNewCloudRepoName(e.target.value)}
                placeholder="Repo name"
                className="form-input"
              />
              <input
                type="text"
                value={newCloudRepoRemoteUrl}
                onChange={(e) => setNewCloudRepoRemoteUrl(e.target.value)}
                placeholder="Remote URL (valgfri)"
                className="form-input"
              />
              <input
                type="text"
                value={newCloudRepoBranch}
                onChange={(e) => setNewCloudRepoBranch(e.target.value)}
                placeholder="Default branch"
                className="form-input"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={createCloudRepo}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                disabled={cloudLoading}
              >
                + Opret repo i cloud
              </button>
            </div>

            {cloudLoading ? (
              <div className="text-sm text-text-muted">Henter...</div>
            ) : cloudRepos.length === 0 ? (
              <div className="text-sm text-text-muted">Ingen cloud repos endnu.</div>
            ) : (
              <div className="space-y-2">
                {cloudRepos.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-bg-tertiary border border-border-primary rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{r.name}</div>
                      <div className="text-xs text-text-muted truncate font-mono">
                        {(r.remoteUrl ?? "").trim() || "(no remote url)"} • {(r.defaultBranch ?? "").trim() || "(no branch)"}
                      </div>
                    </div>
                    <button
                      onClick={() => archiveCloudRepo(r.id)}
                      className="px-3 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover"
                      disabled={cloudLoading}
                    >
                      Arkivér
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
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
    let cancelled = false;
    (async () => {
      try {
        const api = (window as any).sca01?.chat;
        const list = await api?.getModels?.();
        const parsed = Array.isArray(list)
          ? list
              .filter((m) => m && typeof m.name === 'string')
              .map((m) => ({ name: m.name as string, size: (m.size as string) ?? '' }))
          : [];
        if (!cancelled) setModels(parsed);
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();
  const catalog = MCP_SERVER_CATALOG.filter((s) => {
    // Keep WidgetDC visible even if user filters heavily.
    if (s.category === 'widgetdc' && normalized.length === 0) return true;

    if (normalized.length === 0) return s.popular === true || s.category === 'widgetdc';

    return (
      s.name.toLowerCase().includes(normalized) ||
      s.description.toLowerCase().includes(normalized) ||
      (s.tags ?? []).some((t) => t.toLowerCase().includes(normalized))
    );
  });

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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-input mb-4"
        />
        <div className="space-y-2">
          {catalog.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-bg-tertiary border border-border-primary rounded-lg flex items-center gap-3 cursor-pointer hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 bg-bg-secondary rounded-lg flex items-center justify-center text-xl">
                {s.icon ?? '🔌'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-text-muted">
                  {s.transport} • {s.category}
                </div>
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
          <select className="form-input" aria-label="Vælg Prompt">
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
        <button className="btn btn-primary mt-3">
          Gem prompt
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
            Fuld system-adgang <span className="text-warning">(farligt)</span>
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
            Auto-godkend alle operationer <span className="text-warning">(farligt)</span>
          </span>
        </label>
      </Section>

      <Section title="Blokerede Stier">
        <textarea
          defaultValue={`.git\nnode_modules\n.env`}
          rows={4}
          className="form-input font-mono text-sm"
          aria-label="Blokerede stier"
        />
      </Section>

      <button className="btn btn-primary">Gem sikkerhed</button>
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
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
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

