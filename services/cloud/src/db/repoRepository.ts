import { query } from "./database.js";

export interface RepoPolicy {
  allowRead?: boolean;
  allowWrite?: boolean;
  allowExec?: boolean;
  allowNetwork?: boolean;
  allowBrowser?: boolean;
  allowClipboard?: boolean;
  allowedPaths?: string[];
  blockedPaths?: string[];
}

export interface UserRepo {
  id: string;
  userId: string;
  name: string;
  localPath: string | null;
  remoteUrl: string | null;
  defaultBranch: string | null;
  policy: RepoPolicy;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

export async function listReposByUserId(userId: string, includeArchived = false): Promise<UserRepo[]> {
  const result = await query<UserRepo>(
    `SELECT id,
            user_id as "userId",
            name,
            local_path as "localPath",
            remote_url as "remoteUrl",
            default_branch as "defaultBranch",
            policy,
            created_at as "createdAt",
            updated_at as "updatedAt",
            is_archived as "isArchived"
     FROM user_repos
     WHERE user_id = $1 ${includeArchived ? "" : "AND is_archived = FALSE"}
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function findRepoById(repoId: string): Promise<UserRepo | null> {
  const result = await query<UserRepo>(
    `SELECT id,
            user_id as "userId",
            name,
            local_path as "localPath",
            remote_url as "remoteUrl",
            default_branch as "defaultBranch",
            policy,
            created_at as "createdAt",
            updated_at as "updatedAt",
            is_archived as "isArchived"
     FROM user_repos
     WHERE id = $1`,
    [repoId]
  );
  return result.rows[0] ?? null;
}

export async function createRepo(
  userId: string,
  input: {
    name: string;
    localPath?: string | null;
    remoteUrl?: string | null;
    defaultBranch?: string | null;
    policy?: RepoPolicy;
  }
): Promise<UserRepo> {
  const result = await query<UserRepo>(
    `INSERT INTO user_repos (user_id, name, local_path, remote_url, default_branch, policy)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id,
               user_id as "userId",
               name,
               local_path as "localPath",
               remote_url as "remoteUrl",
               default_branch as "defaultBranch",
               policy,
               created_at as "createdAt",
               updated_at as "updatedAt",
               is_archived as "isArchived"`,
    [
      userId,
      input.name,
      input.localPath ?? null,
      input.remoteUrl ?? null,
      input.defaultBranch ?? null,
      JSON.stringify(input.policy ?? {})
    ]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to create repo");
  return row;
}

export async function updateRepo(
  repoId: string,
  userId: string,
  updates: {
    name?: string;
    localPath?: string | null;
    remoteUrl?: string | null;
    defaultBranch?: string | null;
    policy?: RepoPolicy;
    isArchived?: boolean;
  }
): Promise<UserRepo | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.localPath !== undefined) {
    sets.push(`local_path = $${idx++}`);
    values.push(updates.localPath);
  }
  if (updates.remoteUrl !== undefined) {
    sets.push(`remote_url = $${idx++}`);
    values.push(updates.remoteUrl);
  }
  if (updates.defaultBranch !== undefined) {
    sets.push(`default_branch = $${idx++}`);
    values.push(updates.defaultBranch);
  }
  if (updates.policy !== undefined) {
    sets.push(`policy = $${idx++}`);
    values.push(JSON.stringify(updates.policy));
  }
  if (updates.isArchived !== undefined) {
    sets.push(`is_archived = $${idx++}`);
    values.push(updates.isArchived);
  }

  if (sets.length === 0) return findRepoById(repoId);

  sets.push("updated_at = NOW()");
  values.push(repoId, userId);

  const result = await query<UserRepo>(
    `UPDATE user_repos
     SET ${sets.join(", ")}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING id,
               user_id as "userId",
               name,
               local_path as "localPath",
               remote_url as "remoteUrl",
               default_branch as "defaultBranch",
               policy,
               created_at as "createdAt",
               updated_at as "updatedAt",
               is_archived as "isArchived"`,
    values
  );

  return result.rows[0] ?? null;
}

export async function archiveRepo(repoId: string, userId: string): Promise<boolean> {
  const result = await query(
    "UPDATE user_repos SET is_archived = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}


