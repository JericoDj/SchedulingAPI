const { query } = require('./db');

let migrationPromise = null;

const platformTables = [
  'instagram_posts',
  'facebook_posts',
  'tiktok_posts',
  'linkedin_posts',
  'threads_posts',
  'x_posts',
  'youtube_posts',
  'pinterest_posts',
];

const createPlatformTableSql = (tableName) => `
  CREATE TABLE IF NOT EXISTS ${tableName} (
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
  )
`;

const runMigrations = async () => {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    try {
      await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

      await query(`
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);

      for (const tableName of platformTables) {
        await query(createPlatformTableSql(tableName));
        await query(`
          CREATE INDEX IF NOT EXISTS idx_${tableName}_user_id
          ON ${tableName} (user_id)
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_${tableName}_schedule_status
          ON ${tableName} (status, scheduled_at)
        `);
        await query(`
          DROP TRIGGER IF EXISTS set_${tableName}_updated_at ON ${tableName}
        `);
        await query(`
          CREATE TRIGGER set_${tableName}_updated_at
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at()
        `);
      }

      await query(`
        CREATE TABLE IF NOT EXISTS scheduled_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform VARCHAR(30) NOT NULL,
          content JSONB NOT NULL DEFAULT '{}'::jsonb,
          scheduled_at TIMESTAMPTZ NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          provider_post_id VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        ALTER TABLE scheduled_posts
        ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS error_message TEXT,
        ADD COLUMN IF NOT EXISTS provider_post_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id
        ON scheduled_posts (user_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled_at
        ON scheduled_posts (status, scheduled_at)
      `);

      await query(`
        DROP TRIGGER IF EXISTS set_scheduled_posts_updated_at ON scheduled_posts
      `);

      await query(`
        CREATE TRIGGER set_scheduled_posts_updated_at
        BEFORE UPDATE ON scheduled_posts
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at()
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS content_library (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          media_type VARCHAR(50) NOT NULL,
          platform VARCHAR(50),
          format_category VARCHAR(50),
          title VARCHAR(255),
          description TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        ALTER TABLE content_library
        ADD COLUMN IF NOT EXISTS platform VARCHAR(50)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_content_library_user_id
        ON content_library (user_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_content_library_platform
        ON content_library (platform)
      `);

      await query(`
        DROP TRIGGER IF EXISTS set_content_library_updated_at ON content_library
      `);

      await query(`
        CREATE TRIGGER set_content_library_updated_at
        BEFORE UPDATE ON content_library
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at()
      `);

      console.log('[DB] Migrations applied successfully.');
    } catch (error) {
      console.error('[DB] Migration error:', error.message);
    }
  })();

  return migrationPromise;
};

module.exports = { runMigrations };
