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

