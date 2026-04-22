const { query } = require('../config/db');

class ScheduledPostModel {
  async create({ user_id, platform, content, scheduled_at }) {
    const sql = `
      INSERT INTO scheduled_posts (
        user_id,
        platform,
        content,
        scheduled_at,
        status
      )
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;

    const { rows } = await query(sql, [user_id, platform, content, scheduled_at]);
    return rows[0];
  }

  async findAllByUser(userId) {
    const sql = `
      SELECT *
      FROM scheduled_posts
      WHERE user_id = $1
      ORDER BY scheduled_at ASC, created_at DESC
    `;

    const { rows } = await query(sql, [userId]);
    return rows;
  }

  async claimDuePending(limit = 10) {
    const sql = `
      WITH due_ids AS (
        SELECT id
        FROM scheduled_posts
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE scheduled_posts
      SET status = 'processing',
          error_message = NULL,
          updated_at = NOW()
      WHERE id IN (SELECT id FROM due_ids)
      RETURNING *
    `;

    const { rows } = await query(sql, [limit]);
    return rows;
  }

  async markPosted(id, providerPostId = null) {
    const sql = `
      UPDATE scheduled_posts
      SET status = 'posted',
          error_message = NULL,
          provider_post_id = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await query(sql, [id, providerPostId]);
    return rows[0] || null;
  }

  async markFailed(id, errorMessage) {
    const sql = `
      UPDATE scheduled_posts
      SET status = 'failed',
          retry_count = retry_count + 1,
          error_message = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await query(sql, [id, errorMessage]);
    return rows[0] || null;
  }
  async updatePost(id, userId, updates) {
    const { content, scheduled_at } = updates;
    const sql = `
      UPDATE scheduled_posts
      SET content = $3,
          scheduled_at = $4,
          status = 'pending',
          error_message = NULL,
          retry_count = 0,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await query(sql, [id, userId, content, scheduled_at]);
    return rows[0] || null;
  }

  async deletePost(id, userId) {
    const sql = `
      DELETE FROM scheduled_posts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const { rows } = await query(sql, [id, userId]);
    return rows[0] || null;
  }
}

module.exports = new ScheduledPostModel();
