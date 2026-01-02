import { useEffect, useState, useCallback } from 'react';

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

const DEFAULT_SETTINGS: UISettings = {
  ollamaHost: 'http://localhost:11434',
  model: 'qwen3',
  maxTurns: 16,
  systemPrompt: '',
  fullAccess: false,
  autoApprove: false,
  theme: 'dark',
  backendUrl: '',
  useCloud: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking');

  useEffect(() => {
    const load = async () => {
      try {
        const api = (window as any).sca01?.chat;
        if (api?.getConfig) {
          const cfg = await api.getConfig();
          setSettings((prev) => ({ ...prev, ...cfg }));
          applyTheme(cfg.theme ?? DEFAULT_SETTINGS.theme);
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
      } catch {
        setOllamaStatus('offline');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    settings,
    updateSettings,
    ollamaStatus,
  };
}
