import { query } from "./database.js";

// ============================================================================
// SESSION REPOSITORY
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  notionPageId: string | null;
  isArchived: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  toolCalls: unknown | null;
  toolName: string | null;
  createdAt: Date;
}

// ========== SESSIONS ==========

export async function createSession(
  userId: string,
  title: string = "Ny samtale",
  model: string = "qwen3",
  systemPrompt?: string
): Promise<Session> {
  const result = await query<Session>(
    `INSERT INTO sessions (user_id, title, model, system_prompt)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id as "userId", title, model, system_prompt as "systemPrompt",
               created_at as "createdAt", updated_at as "updatedAt", 
               notion_page_id as "notionPageId", is_archived as "isArchived"`,
    [userId, title, model, systemPrompt ?? null]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to create session");
  return row;
}

export async function findSessionById(id: string): Promise<Session | null> {
  const result = await query<Session>(
    `SELECT id, user_id as "userId", title, model, system_prompt as "systemPrompt",
            created_at as "createdAt", updated_at as "updatedAt",
            notion_page_id as "notionPageId", is_archived as "isArchived"
     FROM sessions
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function findSessionsByUserId(
  userId: string,
  includeArchived: boolean = false
): Promise<Session[]> {
  const result = await query<Session>(
    `SELECT id, user_id as "userId", title, model, system_prompt as "systemPrompt",
            created_at as "createdAt", updated_at as "updatedAt",
            notion_page_id as "notionPageId", is_archived as "isArchived"
     FROM sessions
     WHERE user_id = $1 ${includeArchived ? "" : "AND is_archived = FALSE"}
     ORDER BY updated_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function updateSession(
  id: string,
  updates: { title?: string; model?: string; systemPrompt?: string; notionPageId?: string; isArchived?: boolean }
): Promise<Session | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    sets.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.model !== undefined) {
    sets.push(`model = $${paramIndex++}`);
    values.push(updates.model);
  }
  if (updates.systemPrompt !== undefined) {
    sets.push(`system_prompt = $${paramIndex++}`);
    values.push(updates.systemPrompt);
  }
  if (updates.notionPageId !== undefined) {
    sets.push(`notion_page_id = $${paramIndex++}`);
    values.push(updates.notionPageId);
  }
  if (updates.isArchived !== undefined) {
    sets.push(`is_archived = $${paramIndex++}`);
    values.push(updates.isArchived);
  }

  if (sets.length === 0) return findSessionById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<Session>(
    `UPDATE sessions SET ${sets.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, user_id as "userId", title, model, system_prompt as "systemPrompt",
               created_at as "createdAt", updated_at as "updatedAt",
               notion_page_id as "notionPageId", is_archived as "isArchived"`,
    values
  );

  return result.rows[0] ?? null;
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await query("DELETE FROM sessions WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

// ========== MESSAGES ==========

export async function createMessage(
  sessionId: string,
  role: Message["role"],
  content: string | null,
  toolCalls?: unknown,
  toolName?: string
): Promise<Message> {
  // Also update session's updated_at
  await query("UPDATE sessions SET updated_at = NOW() WHERE id = $1", [sessionId]);

  const result = await query<Message>(
    `INSERT INTO messages (session_id, role, content, tool_calls, tool_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, session_id as "sessionId", role, content, 
               tool_calls as "toolCalls", tool_name as "toolName", 
               created_at as "createdAt"`,
    [sessionId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, toolName ?? null]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to create message");
  return row;
}

export async function findMessagesBySessionId(sessionId: string): Promise<Message[]> {
  const result = await query<Message>(
    `SELECT id, session_id as "sessionId", role, content,
            tool_calls as "toolCalls", tool_name as "toolName",
            created_at as "createdAt"
     FROM messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return result.rows;
}

export async function getMessageCount(sessionId: string): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM messages WHERE session_id = $1",
    [sessionId]
  );

  return parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function deleteMessage(id: string): Promise<boolean> {
  const result = await query("DELETE FROM messages WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

