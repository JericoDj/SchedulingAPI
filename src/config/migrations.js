const { query } = require('./db');

/**
 * Run database migrations to ensure all required tables and columns exist.
 * These are idempotent (safe to run on every startup).
 */
const runMigrations = async () => {
  try {
    // Create content_library table if it doesn't exist
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

    // Ensure platform column exists (in case table was created before the column was added)
    await query(`
      ALTER TABLE content_library
      ADD COLUMN IF NOT EXISTS platform VARCHAR(50)
    `);

    // Create updated_at trigger for content_library
    await query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
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

    // Create index if it doesn't exist
    await query(`
      CREATE INDEX IF NOT EXISTS idx_content_library_user_id
      ON content_library (user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_content_library_platform
      ON content_library (platform)
    `);

    console.log('[DB] Migrations applied successfully.');
  } catch (error) {
    console.error('[DB] Migration error:', error.message);
    // Don't throw - migrations are best-effort; don't crash the server
  }
};

module.exports = { runMigrations };
