const { query } = require('./src/config/db');

async function ensureYoutubeTable() {
  console.log('Ensuring youtube_posts table exists...');
  
  const statements = [
    `CREATE TABLE IF NOT EXISTS youtube_posts (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_youtube_posts_user_id ON youtube_posts (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_youtube_posts_schedule_status ON youtube_posts (status, scheduled_at)`,
    `DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_youtube_posts_updated_at') THEN
            CREATE TRIGGER set_youtube_posts_updated_at
            BEFORE UPDATE ON youtube_posts
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
        END IF;
    END
    $$`
  ];

  try {
    for (const sql of statements) {
      await query(sql);
    }
    console.log('youtube_posts table and indices created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating youtube_posts table:', err);
    process.exit(1);
  }
}

ensureYoutubeTable();
