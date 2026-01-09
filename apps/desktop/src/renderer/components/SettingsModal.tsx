import React, { memo, useEffect, useId, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

import { MCP_SERVER_CATALOG } from '../../mcp/serverCatalog';
import { IconBolt, IconPlug, IconPulse, IconSettings, IconShield, IconX, IconPlus, IconTrash, IconCircle, IconSparkles } from './icons';
import { useToast } from './Toast';
import { UISettings } from '../hooks/useSettings';

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
  romaStrategy?: 'react' | 'cot' | 'code_act';
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
            {activeTab === 'pulse' && (
              <PulseSettings />
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
  settings: UISettings;
  onUpdate: (s: Partial<UISettings>) => void;
}) {
  const { showToast } = useToast();
  const [models, setModels] = useState<Array<{ name: string; size: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pullInput, setPullInput] = useState('');
  const [pullStatus, setPullStatus] = useState('');

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const api = (window as any).sca01?.chat;
      if (api?.getModels) {
        const list = await api.getModels();
        const parsed = Array.isArray(list)
          ? list
            .filter((m) => m && typeof m.name === 'string')
            .map((m) => ({ name: m.name as string, size: (m.size as string) ?? '' }))
          : [];
        setModels(parsed);
      }
    } catch (e) {
      console.error('Error fetching models:', e);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (modelName: string) => {
    if (!window.confirm(`Er du sikker på, at du vil slette modellen "${modelName}"?`)) return;
    try {
      const api = (window as any).sca01?.chat;
      if (api?.deleteModel) {
        const res = await api.deleteModel(modelName);
        if (res?.success) {
          showToast(`Modellen "${modelName}" er slettet`, 'success');
          fetchModels();
        } else {
          showToast(`Kunne ikke slette model: ${res?.error}`, 'error');
        }
      }
    } catch (e) {
      showToast('Fejl under sletning', 'error');
    }
  };

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handlePull = async () => {
    const model = pullInput.trim();
    if (!model) return;

    setPulling(true);
    setPullStatus(`Downloader ${model}...`);
    try {
      const api = (window as any).sca01?.chat;
      const res = await api?.pullModel?.(model);
      if (res?.success) {
        showToast(`${model} er installeret!`, 'success');
        setPullStatus(`Færdig! ${model} er installeret.`);
        setPullInput('');
        await fetchModels();
      } else {
        const error = res?.error || 'Kunne ikke hente model';
        showToast(`Fejl under hentning: ${error}`, 'error');
        setPullStatus(`Fejl: ${error}`);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Ukendt fejl';
      showToast(`Kritisk fejl: ${error}`, 'error');
      setPullStatus(`Fejl: ${error}`);
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="📥 Installer Ny Model">
        <p className="text-sm text-text-secondary mb-3">
          Indtast navnet på en model fra Ollama library (fx <code>phi3:mini</code> eller <code>mistral</code>) for at installere den.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={pullInput}
            onChange={(e) => setPullInput(e.target.value)}
            placeholder="phi3:mini"
            className="form-input flex-1"
            disabled={pulling}
          />
          <button
            onClick={handlePull}
            disabled={pulling || !pullInput.trim()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {pulling ? 'Henter...' : 'Installer'}
          </button>
        </div>
        {pullStatus && (
          <p className={`mt-2 text-xs font-medium ${pullStatus.startsWith('Fejl') ? 'text-error' : 'text-accent'}`}>
            {pullStatus}
          </p>
        )}
      </Section>

      <Section title="📦 Installerede Modeller">
        {loading ? (
          <p className="text-text-muted">Henter modeller...</p>
        ) : (
          <div className="space-y-2">
            {models.length === 0 ? (
              <p className="text-sm text-text-muted italic">Ingen modeller fundet. Installér en ovenfor eller tjek din Ollama forbindelse.</p>
            ) : (
              models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{model.name}</div>
                    <div className="text-[10px] text-text-muted font-mono">{model.size}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onUpdate({ model: model.name })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${model.name === settings.model
                        ? 'bg-accent text-white shadow-[0_0_15px_rgba(226,0,116,0.3)]'
                        : 'bg-white/5 border border-white/10 text-text-muted hover:text-text-primary hover:border-white/20'
                        }`}
                    >
                      {model.name === settings.model ? 'AKTIV' : 'VÆLG'}
                    </button>
                    <button
                      onClick={() => handleDelete(model.name)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Slet model"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function MCPSettings() {
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState<Array<{ id: string; name: string; type: string; endpoint: string; enabled: boolean }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [includeAuth, setIncludeAuth] = useState(false);

  // NOTE: window.chat is provided by Electron preload. Some TS setups may not pick up global.d.ts reliably,
  // so we access it via a safe cast to keep the renderer typecheck clean.
  const mcp = ((window as unknown as { sca01?: any }).sca01?.mcp ??
    (window as unknown as { chat?: any }).chat) as
    | {
      getMcpServers?: () => Promise<
        Array<{ id: string; name: string; type: string; endpoint: string; enabled: boolean }>
      >;
      installMcpFromCatalog?: (serverId: string) => Promise<{
        success: boolean;
        error?: string;
        requiresAuth?: boolean;
        authEnvVar?: string;
      }>;
      removeMcpServer?: (name: string) => Promise<boolean>;
      autoSetupMcp?: (opts?: { includeAuth?: boolean }) => Promise<{
        success: boolean;
        installed: string[];
        skipped: Array<{ id: string; name: string; reason: string; authEnvVar?: string }>;
        requiresAuth: Array<{ id: string; name: string; authEnvVar?: string }>;
      }>;
    }
    | undefined;

  async function refreshInstalled() {
    try {
      const list = (await mcp?.getMcpServers?.()) ?? [];
      // Only show custom services as MCP servers (ConfigStore also contains Ollama Local, etc.)
      setInstalled(list.filter((s) => s.type === "custom"));
    } catch {
      setInstalled([]);
    }
  }

  useEffect(() => {
    void refreshInstalled();
  }, []);

  const isInstalled = (name: string) => installed.some((s) => s.name === name);

  async function install(serverId: string) {
    setBusy(serverId);
    setNotice(null);
    try {
      const res = await mcp?.installMcpFromCatalog?.(serverId);
      if (!res) {
        setNotice("MCP install API ikke tilgængelig (preload/IPC).");
        return;
      }
      if (!res.success) {
        setNotice(res.error ?? "Installering fejlede");
        return;
      }
      if (res.requiresAuth && res.authEnvVar) {
        setNotice(`Installeret. Kræver env var: ${res.authEnvVar}`);
      } else {
        setNotice("Installeret ✅");
      }
      await refreshInstalled();
    } finally {
      setBusy(null);
    }
  }

  async function remove(name: string) {
    setBusy(name);
    setNotice(null);
    try {
      await mcp?.removeMcpServer?.(name);
      await refreshInstalled();
      setNotice("Fjernet ✅");
    } finally {
      setBusy(null);
    }
  }

  async function autoSetup() {
    setBusy("auto");
    setNotice(null);
    try {
      const res = await mcp?.autoSetupMcp?.({ includeAuth });
      if (!res?.success) {
        setNotice("Auto-opsæt fejlede.");
        return;
      }
      const installedCount = res.installed.length;
      const skippedAuth = res.skipped.filter((s) => s.reason === "requires_auth");
      const authEnvVars = (res.requiresAuth ?? [])
        .map((s) => s.authEnvVar)
        .filter((v): v is string => typeof v === "string" && v.length > 0);
      const uniqueEnvVars = Array.from(new Set(authEnvVars));

      const msg = (() => {
        if (!includeAuth && skippedAuth.length) {
          return `Auto-opsæt færdig ✅ Installeret: ${installedCount}. Skippede (kræver auth): ${skippedAuth
            .map((s) => s.name)
            .join(", ")}.`;
        }
        if (includeAuth && uniqueEnvVars.length) {
          return `Auto-opsæt færdig ✅ Installeret: ${installedCount}. Næste: sæt credentials env vars for auth-servere: ${uniqueEnvVars.join(
            ", "
          )}.`;
        }
        return `Auto-opsæt færdig ✅ Installeret: ${installedCount}.`;
      })();
      setNotice(msg);
      await refreshInstalled();
    } finally {
      setBusy(null);
    }
  }

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
        {notice ? (
          <div className="p-3 rounded-lg border border-border-primary bg-bg-tertiary text-sm text-text-secondary">
            {notice}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary">
            <div>Auto-opsæt installerer anbefalede MCP servere.</div>
            <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAuth}
                onChange={(e) => setIncludeAuth(e.target.checked)}
                className="w-4 h-4 rounded border-border-primary"
              />
              <span className="text-sm">Inkludér auth-servere (GitHub/Brave/Postgres) og vis credential-guide</span>
            </label>
          </div>
          <button
            onClick={() => void autoSetup()}
            disabled={busy === "auto"}
            className="px-3 py-2 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-60"
          >
            {busy === "auto" ? "Opsætter…" : "Auto-opsæt MCP"}
          </button>
        </div>

        <div className="p-3 bg-bg-tertiary border border-border-primary rounded-lg flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <div className="flex-1">
            <div className="font-semibold text-sm">SCA-01 Tools</div>
            <div className="text-xs text-text-muted">stdio • Lokal (built-in)</div>
          </div>
        </div>

        {installed.length === 0 ? (
          <div className="text-sm text-text-muted mt-3">Ingen ekstra MCP servere installeret endnu.</div>
        ) : (
          <div className="space-y-2 mt-3">
            {installed.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-bg-tertiary border border-border-primary rounded-lg flex items-center gap-3"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-text-muted">{s.endpoint}</div>
                </div>
                <button
                  onClick={() => void remove(s.name)}
                  disabled={busy === s.name}
                  className="px-3 py-1 text-sm bg-bg-secondary border border-border-primary rounded hover:bg-bg-hover disabled:opacity-60"
                >
                  {busy === s.name ? "…" : "Fjern"}
                </button>
              </div>
            ))}
          </div>
        )}
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
              onClick={() => void install(s.id)}
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
                {isInstalled(s.name) ? "Installeret" : busy === s.id ? "…" : "+ Tilføj"}
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
      <Section title="🤖 Agent Strategi">
        <FormGroup label="ROMÅ Planning Strategy">
          <select
            value={(settings as any).romaStrategy || 'react'}
            onChange={(e) => onUpdate({ ...(settings as any), romaStrategy: e.target.value })}
            className="form-input"
            aria-label="Vælg ROMÅ strategi"
          >
            <option value="react">ReAct (Reasoning + Acting)</option>
            <option value="cot">Chain-of-Thought (Step-by-step reasoning)</option>
            <option value="code_act">CodeAct (Code generation focus)</option>
          </select>
        </FormGroup>
        <p className="text-xs text-text-muted mt-1">
          Vælg hvordan agenten skal planlægge og udføre opgaver. ReAct er standard for balance mellem hastighed og nøjagtighed.
        </p>
      </Section>

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
              className={`p-3 border rounded-lg text-left transition-colors ${settings.theme === t.id
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

type PulseCategory = 'THREAT' | 'AI_INSIGHT' | 'BUSINESS' | 'ACTIVITY' | 'PERSONAL' | 'FAMILY';

interface PulsePreferences {
  enabled: boolean;
  dailyTime: string;
  maxCards: number;
  categories: Record<PulseCategory, { enabled: boolean; weight: number }>;
  interests: string[];
  blockedKeywords: string[];
}

const CATEGORY_INFO: Record<PulseCategory, { label: string; emoji: string; description: string }> = {
  THREAT: { label: 'Cybersikkerhed', emoji: '🔴', description: 'CVEs, sårbarheder, trusler' },
  AI_INSIGHT: { label: 'AI-indsigter', emoji: '🟣', description: 'ML-nyheder, LLM-opdateringer' },
  BUSINESS: { label: 'Forretning', emoji: '🟡', description: 'Tech-industri, startups' },
  ACTIVITY: { label: 'Aktivitet', emoji: '🔵', description: 'GitHub, projekter, netværk' },
  PERSONAL: { label: 'Personlig Assistent', emoji: '🧠', description: 'Opgaver, påmindelser, mål fra Neo4J' },
  FAMILY: { label: 'Familie', emoji: '👨‍👩‍👧‍👦', description: 'Fødselsdage, events, kontakt fra Neo4J' },
};

function PulseSettings() {
  const [prefs, setPrefs] = useState<PulsePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newBlocked, setNewBlocked] = useState('');
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean; nextScheduledRun: string | null } | null>(null);

  const pulseApi = (window as any).pulse ?? (window as any).electronAPI?.pulse;

  useEffect(() => {
    loadPreferences();
    loadSchedulerStatus();
  }, []);

  async function loadPreferences() {
    setLoading(true);
    setError(null);
    try {
      const res = await pulseApi?.getPreferences?.();
      if (res?.success && res.data) {
        setPrefs(res.data);
      } else {
        // Default preferences
        setPrefs({
          enabled: true,
          dailyTime: '05:00',
          maxCards: 10,
          categories: {
            THREAT: { enabled: true, weight: 1.0 },
            AI_INSIGHT: { enabled: true, weight: 1.0 },
            BUSINESS: { enabled: true, weight: 0.8 },
            ACTIVITY: { enabled: true, weight: 0.6 },
            PERSONAL: { enabled: true, weight: 1.0 },
            FAMILY: { enabled: true, weight: 0.9 },
          },
          interests: [],
          blockedKeywords: [],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente indstillinger');
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedulerStatus() {
    try {
      const res = await pulseApi?.getSchedulerStatus?.();
      if (res?.success && res.data) {
        setSchedulerStatus(res.data);
      }
    } catch {
      // Ignore
    }
  }

  async function savePreferences(updates: Partial<PulsePreferences>) {
    if (!prefs) return;
    setSaving(true);
    try {
      const updated = { ...prefs, ...updates };
      await pulseApi?.updatePreferences?.(updated);
      setPrefs(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme indstillinger');
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setSaving(true);
    try {
      await pulseApi?.runNow?.();
      await loadSchedulerStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke køre digest');
    } finally {
      setSaving(false);
    }
  }

  function addInterest() {
    if (!prefs || !newInterest.trim()) return;
    const interests = [...prefs.interests, newInterest.trim()];
    setNewInterest('');
    savePreferences({ interests });
  }

  function removeInterest(interest: string) {
    if (!prefs) return;
    const interests = prefs.interests.filter(i => i !== interest);
    savePreferences({ interests });
  }

  function addBlocked() {
    if (!prefs || !newBlocked.trim()) return;
    const blockedKeywords = [...prefs.blockedKeywords, newBlocked.trim()];
    setNewBlocked('');
    savePreferences({ blockedKeywords });
  }

  function removeBlocked(keyword: string) {
    if (!prefs) return;
    const blockedKeywords = prefs.blockedKeywords.filter(k => k !== keyword);
    savePreferences({ blockedKeywords });
  }

  function toggleCategory(cat: PulseCategory) {
    if (!prefs) return;
    const categories = {
      ...prefs.categories,
      [cat]: { ...prefs.categories[cat], enabled: !prefs.categories[cat].enabled },
    };
    savePreferences({ categories });
  }

  function updateCategoryWeight(cat: PulseCategory, weight: number) {
    if (!prefs) return;
    const categories = {
      ...prefs.categories,
      [cat]: { ...prefs.categories[cat], weight },
    };
    savePreferences({ categories });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-muted">Henter Pulse+ indstillinger...</div>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="text-center py-12">
        <div className="text-text-muted">Kunne ikke indlæse indstillinger</div>
        {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      <Section title="⚡ Pulse+ Daily Briefing">
        <p className="text-sm text-text-secondary mb-4">
          Få en daglig briefing med de vigtigste nyheder og indsigter inden for dine interesseområder.
        </p>

        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => savePreferences({ enabled: e.target.checked })}
            className="w-5 h-5 rounded border-border-primary"
            disabled={saving}
          />
          <span className="font-medium">Aktivér Pulse+ Daily Briefing</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Daglig briefing-tid">
            <input
              type="time"
              value={prefs.dailyTime}
              onChange={(e) => savePreferences({ dailyTime: e.target.value })}
              className="form-input"
              disabled={saving || !prefs.enabled}
            />
          </FormGroup>
          <FormGroup label="Max kort per dag">
            <input
              type="number"
              min={1}
              max={50}
              value={prefs.maxCards}
              onChange={(e) => savePreferences({ maxCards: parseInt(e.target.value) || 10 })}
              className="form-input"
              disabled={saving || !prefs.enabled}
            />
          </FormGroup>
        </div>

        {schedulerStatus && (
          <div className="flex items-center justify-between p-3 bg-bg-tertiary border border-border-primary rounded-lg mt-4">
            <div>
              <div className="text-sm font-medium">
                Scheduler: {schedulerStatus.isRunning ? '🟢 Aktiv' : '🔴 Inaktiv'}
              </div>
              {schedulerStatus.nextScheduledRun && (
                <div className="text-xs text-text-muted">
                  Næste kørsel: {new Date(schedulerStatus.nextScheduledRun).toLocaleString('da-DK')}
                </div>
              )}
            </div>
            <button
              onClick={runNow}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Kører...' : 'Kør nu'}
            </button>
          </div>
        )}
      </Section>

      <Section title="📂 Kategorier">
        <p className="text-sm text-text-secondary mb-4">
          Vælg hvilke kategorier du vil modtage nyheder fra, og juster vægtning.
        </p>
        <div className="space-y-3">
          {(Object.keys(CATEGORY_INFO) as PulseCategory[]).map((cat) => (
            <div
              key={cat}
              className={`p-3 border rounded-lg transition-colors ${prefs.categories[cat].enabled
                ? 'border-accent/50 bg-bg-tertiary'
                : 'border-border-primary bg-bg-secondary opacity-60'
                }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.categories[cat].enabled}
                  onChange={() => toggleCategory(cat)}
                  className="w-4 h-4 rounded"
                  disabled={saving}
                />
                <span className="text-xl">{CATEGORY_INFO[cat].emoji}</span>
                <div className="flex-1">
                  <div className="font-medium">{CATEGORY_INFO[cat].label}</div>
                  <div className="text-xs text-text-muted">{CATEGORY_INFO[cat].description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Vægt:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={prefs.categories[cat].weight}
                    onChange={(e) => updateCategoryWeight(cat, parseFloat(e.target.value))}
                    className="w-20"
                    disabled={saving || !prefs.categories[cat].enabled}
                  />
                  <span className="text-xs w-8">{(prefs.categories[cat].weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="🎯 Interesser">
        <p className="text-sm text-text-secondary mb-4">
          Tilføj emner du er interesseret i for at få mere relevante nyheder.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInterest()}
            placeholder="f.eks. React, Kubernetes, ML..."
            className="form-input flex-1"
            disabled={saving}
          />
          <button
            onClick={addInterest}
            disabled={saving || !newInterest.trim()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
          >
            + Tilføj
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {prefs.interests.map((interest) => (
            <span
              key={interest}
              className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-sm flex items-center gap-2"
            >
              {interest}
              <button
                onClick={() => removeInterest(interest)}
                className="hover:text-red-400"
                disabled={saving}
              >
                ×
              </button>
            </span>
          ))}
          {prefs.interests.length === 0 && (
            <span className="text-sm text-text-muted">Ingen interesser tilføjet endnu</span>
          )}
        </div>
      </Section>

      <Section title="🚫 Blokerede Nøgleord">
        <p className="text-sm text-text-secondary mb-4">
          Nyheder der indeholder disse ord vil blive filtreret væk.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newBlocked}
            onChange={(e) => setNewBlocked(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBlocked()}
            placeholder="f.eks. spam, clickbait..."
            className="form-input flex-1"
            disabled={saving}
          />
          <button
            onClick={addBlocked}
            disabled={saving || !newBlocked.trim()}
            className="px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-hover disabled:opacity-50"
          >
            + Tilføj
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {prefs.blockedKeywords.map((keyword) => (
            <span
              key={keyword}
              className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-sm flex items-center gap-2"
            >
              {keyword}
              <button
                onClick={() => removeBlocked(keyword)}
                className="hover:text-red-400"
                disabled={saving}
              >
                ×
              </button>
            </span>
          ))}
          {prefs.blockedKeywords.length === 0 && (
            <span className="text-sm text-text-muted">Ingen blokerede nøgleord</span>
          )}
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

