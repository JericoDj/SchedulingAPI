const { pool, query } = require('../config/db');

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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const selectSql = `
        SELECT id
        FROM scheduled_posts
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      `;

      const selected = await client.query(selectSql, [limit]);
      const ids = selected.rows.map((row) => row.id);

      if (ids.length === 0) {
        await client.query('COMMIT');
        return [];
      }

      const updateSql = `
        UPDATE scheduled_posts
        SET status = 'processing',
            error_message = NULL,
            updated_at = NOW()
        WHERE id = ANY($1::uuid[])
        RETURNING *
      `;

      const updated = await client.query(updateSql, [ids]);
      await client.query('COMMIT');
      return updated.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markPosted(id) {
    const sql = `
      UPDATE scheduled_posts
      SET status = 'posted',
          error_message = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await query(sql, [id]);
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
}

module.exports = new ScheduledPostModel();
