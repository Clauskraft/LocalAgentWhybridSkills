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
    getConfig: () => Promise<{ ollamaHost: string; model: string }>;
    checkOllama: () => Promise<boolean>;
    sendMessage: (payload: { messages: Array<{ role: string; content: string }>; model?: string; host?: string }) => Promise<{ content: string }>;
    updateSettings: (partial: Record<string, unknown>) => void;
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
      };
    },
    checkOllama: async () => {
      try {
        const cfg = await ipcRenderer.invoke("get-config");
        const host = (cfg as { ollamaHost?: string })?.ollamaHost ?? "http://localhost:11434";
        const res = await fetch(`${host.replace(/\\/+$/, "")}/api/version`);
        return res.ok;
      } catch {
        return false;
      }
    },
    sendMessage: async (payload) => {
      // Minimal stub: echo back last user message
      const last = payload.messages[payload.messages.length - 1];
      return { content: `Echo: ${last?.content ?? ""}` };
    },
    updateSettings: (_partial: Record<string, unknown>) => {
      // no-op stub; settings persisted client-side for now
    }
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

