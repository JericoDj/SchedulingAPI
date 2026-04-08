const { query } = require('../config/db');

const buildUpdateStatement = (fieldMap) => {
  const values = [];
  const setClauses = [];

  Object.entries(fieldMap).forEach(([column, value]) => {
    if (value === undefined) {
      return;
    }

    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  });

  return {
    values,
    setClauses,
  };
};

class BasePostModel {
  constructor(tableName, platform) {
    this.tableName = tableName;
    this.platform = platform;
  }

  async findAllByUser(userId) {
    const sql = `
      SELECT *
      FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY COALESCE(scheduled_at, created_at) DESC
    `;

    const { rows } = await query(sql, [userId]);
    return rows;
  }

  async findById(id, userId) {
    const sql = `
      SELECT *
      FROM ${this.tableName}
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;

    const { rows } = await query(sql, [id, userId]);
    return rows[0] || null;
  }

  async create(postData) {
    const payload = {
      user_id: postData.user_id,
      title: postData.title ?? null,
      caption: postData.caption,
      media_url: postData.media_url ?? null,
      platform_account_id: postData.platform_account_id ?? null,
      status: postData.status ?? 'draft',
      scheduled_at: postData.scheduled_at ?? null,
      published_at: postData.published_at ?? null,
      ai_prompt: postData.ai_prompt ?? null,
      metadata: postData.metadata ?? {},
    };

    const sql = `
      INSERT INTO ${this.tableName} (
        user_id,
        title,
        caption,
        media_url,
        platform_account_id,
        status,
        scheduled_at,
        published_at,
        ai_prompt,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const { rows } = await query(sql, [
      payload.user_id,
      payload.title,
      payload.caption,
      payload.media_url,
      payload.platform_account_id,
      payload.status,
      payload.scheduled_at,
      payload.published_at,
      payload.ai_prompt,
      payload.metadata,
    ]);

    return rows[0];
  }

  async updateStatus(id, userId, status, overrides = {}) {
    return this.update(id, userId, {
      status,
      ...overrides,
    });
  }

  async findScheduledByUser(userId) {
    const sql = `
      SELECT *
      FROM ${this.tableName}
      WHERE user_id = $1
        AND status = 'scheduled'
      ORDER BY scheduled_at ASC NULLS LAST, created_at DESC
    `;

    const { rows } = await query(sql, [userId]);
    return rows;
  }

  async update(id, userId, updates) {
    const fieldMap = {
      title: updates.title,
      caption: updates.caption,
      media_url: updates.media_url,
      platform_account_id: updates.platform_account_id,
      status: updates.status,
      scheduled_at: updates.scheduled_at,
      published_at: updates.published_at,
      ai_prompt: updates.ai_prompt,
      metadata: updates.metadata,
    };

    const { values, setClauses } = buildUpdateStatement(fieldMap);

    if (setClauses.length === 0) {
      return this.findById(id, userId);
    }

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING *
    `;

    const { rows } = await query(sql, [...values, id, userId]);
    return rows[0] || null;
  }

  async delete(id, userId) {
    const sql = `
      DELETE FROM ${this.tableName}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await query(sql, [id, userId]);
    return rows[0] || null;
  }
}

module.exports = BasePostModel;
