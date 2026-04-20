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

class ContentModel {
  async findAllByUser(userId, filters = {}) {
    let sql = `
      SELECT *
      FROM content_library
      WHERE user_id = $1
    `;
    const params = [userId];

    if (filters.media_type) {
      params.push(filters.media_type);
      sql += ` AND media_type = $${params.length}`;
    }

    if (filters.format_category) {
      params.push(filters.format_category);
      sql += ` AND format_category = $${params.length}`;
    }

    if (filters.platform) {
      params.push(filters.platform);
      sql += ` AND platform = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await query(sql, params);
    return rows;
  }

  async findById(id, userId) {
    const sql = `
      SELECT *
      FROM content_library
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;

    const { rows } = await query(sql, [id, userId]);
    return rows[0] || null;
  }

  async create(data) {
    const sql = `
      INSERT INTO content_library (
        user_id,
        file_url,
        file_path,
        file_name,
        file_type,
        media_type,
        platform,
        format_category,
        title,
        description,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const { rows } = await query(sql, [
      data.user_id,
      data.file_url,
      data.file_path,
      data.file_name,
      data.file_type,
      data.media_type,
      data.platform || null,
      data.format_category,
      data.title || null,
      data.description || null,
      data.metadata || {},
    ]);

    return rows[0];
  }

  async update(id, userId, updates) {
    const fieldMap = {
      title: updates.title,
      description: updates.description,
      platform: updates.platform,
      format_category: updates.format_category,
      metadata: updates.metadata,
    };

    const { values, setClauses } = buildUpdateStatement(fieldMap);

    if (setClauses.length === 0) {
      return this.findById(id, userId);
    }

    const sql = `
      UPDATE content_library
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING *
    `;

    const { rows } = await query(sql, [...values, id, userId]);
    return rows[0] || null;
  }

  async delete(id, userId) {
    const sql = `
      DELETE FROM content_library
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await query(sql, [id, userId]);
    return rows[0] || null;
  }
}

module.exports = new ContentModel();
