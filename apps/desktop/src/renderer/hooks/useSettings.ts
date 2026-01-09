import { useEffect, useState, useCallback } from 'react';
import { resolveBackendUrl } from '../lib/backend';

type OllamaStatus = 'online' | 'offline' | 'checking';

export interface UISettings {
  ollamaHost: string;
  model: string;
  maxTurns: number;
  systemPrompt: string;
  fullAccess: boolean;
  autoApprove: boolean;
  theme: string;
  backendUrl?: string;
  useCloud?: boolean;
  safeDirs?: string[];
}

// Backwards-compatible name used by other modules/types.
export type SettingsState = UISettings;

const DEFAULT_SETTINGS: UISettings = {
  ollamaHost: 'http://localhost:11434',
  model: 'qwen3:8b',
  maxTurns: 20,
  systemPrompt: '',
  fullAccess: false,
  autoApprove: false,
  theme: 'dark',
  // Browser/dev mode fallback can be configured via VITE_BACKEND_URL
  backendUrl: resolveBackendUrl(undefined) ?? 'https://sca-01-phase3-production.up.railway.app',
  useCloud: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking');
  const [mcpServersCount, setMcpServersCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const api = (window as any).sca01?.chat;
        if (api?.getConfig) {
          const cfg = await api.getConfig();
          setSettings((prev) => ({ ...prev, ...cfg }));
          applyTheme(cfg.theme ?? DEFAULT_SETTINGS.theme);
        }
        if (api?.getMcpServers) {
          const servers = await api.getMcpServers();
          setMcpServersCount(Object.keys(servers || {}).length);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const applyTheme = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const updateSettings = useCallback((partial: Partial<UISettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    try {
      const api = (window as any).sca01?.chat;
      api?.updateSettings?.(partial);
      if (partial.theme) {
        applyTheme(partial.theme);
        api?.setTheme?.(partial.theme);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      setOllamaStatus('checking');
      try {
        const api = (window as any).sca01?.chat;
        if (api?.checkOllama) {
          const ok = await api.checkOllama();
          setOllamaStatus(ok ? 'online' : 'offline');
        } else {
          // fallback: assume online if unreachable
          setOllamaStatus('online');
        }
        if (api?.getMcpServers) {
          const servers = await api.getMcpServers();
          setMcpServersCount(Object.keys(servers || {}).length);
        }
      } catch {
        setOllamaStatus('offline');
      }
    };
    check();
    // Dynamic interval: check more often if offline (10s), otherwise every minute (60s)
    let intervalTime = ollamaStatus === 'offline' ? 10000 : 60000;
    const interval = setInterval(check, intervalTime);
    return () => clearInterval(interval);
  }, [ollamaStatus]);

  return {
    settings,
    updateSettings,
    ollamaStatus,
    mcpServersCount,
  };
}
