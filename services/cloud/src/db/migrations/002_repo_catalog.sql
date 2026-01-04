-- Repo Catalog (multi-repo support)
-- Stores repos a user can target for agent execution + per-repo policy config.

CREATE TABLE IF NOT EXISTS user_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  local_path TEXT,
  remote_url TEXT,
  default_branch TEXT,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_repos_user ON user_repos(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_repos_archived ON user_repos(user_id, is_archived);


