import { useEffect, useState, useCallback } from 'react';

type OllamaStatus = 'online' | 'offline' | 'checking';

export interface UISettings {
  ollamaHost: string;
  model: string;
  maxTurns: number;
  systemPrompt: string;
  fullAccess: boolean;
  autoApprove: boolean;
}

const DEFAULT_SETTINGS: UISettings = {
  ollamaHost: 'http://localhost:11434',
  model: 'qwen3',
  maxTurns: 16,
  systemPrompt: '',
  fullAccess: false,
  autoApprove: false,
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
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const updateSettings = useCallback((partial: Partial<UISettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    try {
      const api = (window as any).sca01?.chat;
      api?.updateSettings?.(partial);
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
import { useEffect, useState } from 'react';

export interface SettingsState {
  ollamaHost: string;
  model: string;
  maxTurns: number;
  shellTimeout?: number;
  systemPrompt: string;
  fullAccess: boolean;
  autoApprove: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  ollamaHost: 'http://localhost:11434',
  model: 'qwen3',
  maxTurns: 16,
  shellTimeout: 300,
  systemPrompt: '',
  fullAccess: false,
  autoApprove: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.chat?.getConfig?.();
        if (cfg) {
          setSettings((prev) => ({ ...prev, ...cfg }));
        }
      } catch (e) {
        console.warn('useSettings: could not load config', e);
      }
      try {
        const status = await window.chat?.checkOllama?.();
        if (status?.running) setOllamaStatus('online');
        else setOllamaStatus('offline');
      } catch {
        setOllamaStatus('offline');
      }
    })();
  }, []);

  const updateSettings = (next: Partial<SettingsState>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      window.chat?.updateSettings?.(merged);
      return merged;
    });
  };

  return {
    settings,
    updateSettings,
    ollamaStatus,
  };
}

