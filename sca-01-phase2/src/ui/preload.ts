import { contextBridge, ipcRenderer } from "electron";

export interface ApprovalRequest {
  id: string;
  timestamp: string;
  operation: string;
  description: string;
  riskLevel: string;
  status: string;
}

export interface SCA01API {
  getConfig: () => Promise<Record<string, unknown>>;
  runAgent: (goal: string) => Promise<{ result?: string; error?: string }>;
  chat: {
    getConfig: () => Promise<{ ollamaHost: string; model: string; theme?: string; backendUrl?: string; useCloud?: boolean; safeDirs?: string[] }>;
    checkOllama: () => Promise<boolean>;
    sendMessage: (payload: {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      host?: string;
      backendUrl?: string;
      useCloud?: boolean;
    }) => Promise<{ content: string; toolCalls?: unknown[] }>;
    getModels: () => Promise<Array<{ name: string; size?: string }>>;
    updateSettings: (partial: Record<string, unknown>) => void;
    setTheme: (theme: string) => void;
  };
  cloud: {
    status: () => Promise<{ backendUrl: string; encryptionAvailable: boolean; loggedIn: boolean }>;
    login: (payload: { email: string; password: string }) => Promise<{ success: boolean }>;
    logout: () => Promise<{ success: boolean }>;
    listRepos: (payload?: { includeArchived?: boolean }) => Promise<{ repos: unknown[] }>;
    createRepo: (payload: {
      name: string;
      localPath?: string | null;
      remoteUrl?: string | null;
      defaultBranch?: string | null;
      policy?: Record<string, unknown>;
    }) => Promise<{ repo: unknown }>;
    archiveRepo: (payload: { id: string }) => Promise<{ success: boolean }>;
  };
  getPendingApprovals: () => Promise<ApprovalRequest[]>;
  getApprovalHistory: (limit: number) => Promise<ApprovalRequest[]>;
  approveRequest: (id: string) => Promise<boolean>;
  rejectRequest: (id: string) => Promise<boolean>;
  approveAll: () => Promise<number>;
  rejectAll: () => Promise<number>;
  onApprovalRequest: (callback: (request: ApprovalRequest) => void) => void;
  onApprovalResolved: (callback: (request: ApprovalRequest) => void) => void;
}

const api: SCA01API = {
  getConfig: () => ipcRenderer.invoke("get-config"),
  runAgent: (goal: string) => ipcRenderer.invoke("run-agent", goal),
  chat: {
    getConfig: async () => {
      const cfg = await ipcRenderer.invoke("get-config");
      return {
        ollamaHost: (cfg as { ollamaHost?: string })?.ollamaHost ?? "http://localhost:11434",
        model: (cfg as { ollamaModel?: string })?.ollamaModel ?? "qwen3",
        theme: (cfg as { theme?: string })?.theme ?? "dark",
        backendUrl: (cfg as { backendUrl?: string })?.backendUrl ?? "",
        useCloud: (cfg as { useCloud?: boolean })?.useCloud ?? false,
        safeDirs: (cfg as { safeDirs?: string[] })?.safeDirs ?? [],
      };
    },
    checkOllama: async () => {
      try {
        const cfg = await ipcRenderer.invoke("get-config");
        const useCloud = (cfg as { useCloud?: boolean })?.useCloud ?? false;
        const backendUrl = (cfg as { backendUrl?: string })?.backendUrl ?? "";

        // In cloud mode, validate the configured cloud backend instead of a local Ollama instance.
        if (useCloud) {
          const backend = backendUrl.trim();
          if (!backend) return false;
          const res = await fetch(`${backend.replace(/\/+$/, "")}/health`);
          return res.ok;
        }

        const host = (cfg as { ollamaHost?: string })?.ollamaHost ?? "http://localhost:11434";
        if (!host || host.includes("localhost") || host.includes("127.0.0.1")) return false;
        const res = await fetch(`${host.replace(/\/+$/, "")}/api/version`);
        return res.ok;
      } catch {
        return false;
      }
    },
    sendMessage: async (payload) => {
      return ipcRenderer.invoke("chat-send-message", payload);
    },
    getModels: () => ipcRenderer.invoke("chat-get-models"),
    updateSettings: (partial: Record<string, unknown>) => {
      ipcRenderer.invoke("chat-update-settings", partial);
    },
    setTheme: (theme: string) => {
      ipcRenderer.invoke("chat-set-theme", theme);
    }
  },
  cloud: {
    status: () => ipcRenderer.invoke("cloud-status"),
    login: (payload) => ipcRenderer.invoke("cloud-login", payload),
    logout: () => ipcRenderer.invoke("cloud-logout"),
    listRepos: (payload) => ipcRenderer.invoke("cloud-list-repos", payload),
    createRepo: (payload) => ipcRenderer.invoke("cloud-create-repo", payload),
    archiveRepo: (payload) => ipcRenderer.invoke("cloud-archive-repo", payload),
  },
  getPendingApprovals: () => ipcRenderer.invoke("get-pending-approvals"),
  getApprovalHistory: (limit: number) => ipcRenderer.invoke("get-approval-history", limit),
  approveRequest: (id: string) => ipcRenderer.invoke("approve-request", id),
  rejectRequest: (id: string) => ipcRenderer.invoke("reject-request", id),
  approveAll: () => ipcRenderer.invoke("approve-all"),
  rejectAll: () => ipcRenderer.invoke("reject-all"),
  onApprovalRequest: (callback) => {
    ipcRenderer.on("approval-request", (_event, request) => callback(request));
  },
  onApprovalResolved: (callback) => {
    ipcRenderer.on("approval-resolved", (_event, request) => callback(request));
  }
};

contextBridge.exposeInMainWorld("sca01", api);

