import { HyperLog } from "../logging/hyperlog.js";

const GITHUB_API = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  default_branch: string;
  pushed_at?: string;
  updated_at?: string;
}

export class GitHubService {
  private readonly token: string;
  private readonly log: HyperLog;

  constructor(log: HyperLog) {
    const t = process.env.GITHUB_TOKEN;
    if (!t) {
      throw new Error("GITHUB_TOKEN is required for GitHub sync");
    }
    this.token = t;
    this.log = log;
  }

  private async request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const res = await fetch(`${GITHUB_API}${path}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "SCA-01-GitHubSync",
      },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      this.log.error("github.request", `GitHub API error ${res.status}`, { path, body: txt });
      throw new Error(`GitHub API error ${res.status}: ${txt}`);
    }
    return await res.json() as T;
  }

  public async listRepos(): Promise<GitHubRepo[]> {
    this.log.info("github.list_repos", "Listing repos for authenticated user");
    return this.request<GitHubRepo[]>("/user/repos?per_page=100&sort=updated");
  }
}

