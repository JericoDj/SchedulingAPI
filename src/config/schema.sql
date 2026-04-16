CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiktok_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threads_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS x_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS youtube_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pinterest_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT NOT NULL,
  media_url TEXT,
  platform_account_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id
  ON instagram_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_user_id
  ON facebook_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_tiktok_posts_user_id
  ON tiktok_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_user_id
  ON linkedin_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_threads_posts_user_id
  ON threads_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_x_posts_user_id
  ON x_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_posts_user_id
  ON youtube_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_pinterest_posts_user_id
  ON pinterest_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id
  ON scheduled_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_schedule_status
  ON instagram_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_schedule_status
  ON facebook_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_tiktok_posts_schedule_status
  ON tiktok_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_schedule_status
  ON linkedin_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_threads_posts_schedule_status
  ON threads_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_x_posts_schedule_status
  ON x_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_youtube_posts_schedule_status
  ON youtube_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_pinterest_posts_schedule_status
  ON pinterest_posts (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled_at
  ON scheduled_posts (status, scheduled_at);

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_instagram_posts_updated_at ON instagram_posts;
CREATE TRIGGER set_instagram_posts_updated_at
BEFORE UPDATE ON instagram_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_facebook_posts_updated_at ON facebook_posts;
CREATE TRIGGER set_facebook_posts_updated_at
BEFORE UPDATE ON facebook_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_tiktok_posts_updated_at ON tiktok_posts;
CREATE TRIGGER set_tiktok_posts_updated_at
BEFORE UPDATE ON tiktok_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_linkedin_posts_updated_at ON linkedin_posts;
CREATE TRIGGER set_linkedin_posts_updated_at
BEFORE UPDATE ON linkedin_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_threads_posts_updated_at ON threads_posts;
CREATE TRIGGER set_threads_posts_updated_at
BEFORE UPDATE ON threads_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_x_posts_updated_at ON x_posts;
CREATE TRIGGER set_x_posts_updated_at
BEFORE UPDATE ON x_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_youtube_posts_updated_at ON youtube_posts;
CREATE TRIGGER set_youtube_posts_updated_at
BEFORE UPDATE ON youtube_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_pinterest_posts_updated_at ON pinterest_posts;
CREATE TRIGGER set_pinterest_posts_updated_at
BEFORE UPDATE ON pinterest_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER set_scheduled_posts_updated_at
BEFORE UPDATE ON scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
