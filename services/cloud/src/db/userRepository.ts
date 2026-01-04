import { query } from "./database.js";
import bcrypt from "bcryptjs";

// ============================================================================
// USER REPOSITORY
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

const SALT_ROUNDS = 12;

export async function createUser(
  email: string, 
  password: string, 
  displayName?: string
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await query<UserWithPassword>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name as "displayName", created_at as "createdAt", updated_at as "updatedAt"`,
    [email.toLowerCase().trim(), passwordHash, displayName ?? null]
  );

  return result.rows[0] as User;
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await query<UserWithPassword>(
    `SELECT id, email, password_hash as "passwordHash", display_name as "displayName", 
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users 
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, display_name as "displayName", 
            created_at as "createdAt", updated_at as "updatedAt"
     FROM users 
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function updateUser(
  id: string, 
  updates: { displayName?: string; password?: string }
): Promise<User | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.displayName !== undefined) {
    sets.push(`display_name = $${paramIndex++}`);
    values.push(updates.displayName);
  }

  if (updates.password !== undefined) {
    const hash = await bcrypt.hash(updates.password, SALT_ROUNDS);
    sets.push(`password_hash = $${paramIndex++}`);
    values.push(hash);
  }

  if (sets.length === 0) return findUserById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<User>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, email, display_name as "displayName", created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );

  return result.rows[0] ?? null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query("DELETE FROM users WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

