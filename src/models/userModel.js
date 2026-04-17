const { query } = require('../config/db');

const publicUserFields = `
  id,
  name,
  email,
  avatar_url,
  role,
  facebook_page_id,
  facebook_page_name,
  facebook_token_updated_at,
  created_at,
  updated_at
`;

let socialColumnsEnsured = false;

const ensureSocialColumns = async () => {
  if (socialColumnsEnsured) {
    return;
  }

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS facebook_user_access_token TEXT,
    ADD COLUMN IF NOT EXISTS facebook_page_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS facebook_page_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS facebook_page_access_token TEXT,
    ADD COLUMN IF NOT EXISTS facebook_token_updated_at TIMESTAMPTZ
  `);

  socialColumnsEnsured = true;
};

const buildUpdateStatement = (fieldMap, startingIndex = 1) => {
  const values = [];
  const setClauses = [];

  Object.entries(fieldMap).forEach(([column, value]) => {
    if (value === undefined) {
      return;
    }

    values.push(value);
    setClauses.push(`${column} = $${values.length + startingIndex - 1}`);
  });

  return {
    values,
    setClauses,
  };
};

const userModel = {
  async create({ name, email, passwordHash, avatar_url = null, role = 'user' }) {
    await ensureSocialColumns();

    const sql = `
      INSERT INTO users (name, email, password_hash, avatar_url, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [name, email, passwordHash, avatar_url, role]);
    return rows[0];
  },

  async findAll() {
    await ensureSocialColumns();

    const sql = `
      SELECT ${publicUserFields}
      FROM users
      ORDER BY created_at DESC
    `;

    const { rows } = await query(sql);
    return rows;
  },

  async findById(id) {
    await ensureSocialColumns();

    const sql = `
      SELECT ${publicUserFields}
      FROM users
      WHERE id = $1
      LIMIT 1
    `;

    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    await ensureSocialColumns();

    const sql = `
      SELECT ${publicUserFields}
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await query(sql, [email]);
    return rows[0] || null;
  },

  async findByEmailWithPassword(email) {
    await ensureSocialColumns();

    const sql = `
      SELECT
        id,
        name,
        email,
        avatar_url,
        role,
        facebook_page_id,
        facebook_page_name,
        facebook_token_updated_at,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await query(sql, [email]);
    return rows[0] || null;
  },

  async update(id, updates) {
    await ensureSocialColumns();

    const fieldMap = {
      name: updates.name,
      email: updates.email,
      avatar_url: updates.avatar_url,
      role: updates.role,
      password_hash: updates.passwordHash,
    };

    const { values, setClauses } = buildUpdateStatement(fieldMap);

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    const sql = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [...values, id]);
    return rows[0] || null;
  },

  async delete(id) {
    await ensureSocialColumns();

    const sql = `
      DELETE FROM users
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  },

  async saveFacebookConnection(
    userId,
    { userAccessToken, pageId, pageName, pageAccessToken }
  ) {
    await ensureSocialColumns();

    const sql = `
      UPDATE users
      SET facebook_user_access_token = $2,
          facebook_page_id = $3,
          facebook_page_name = $4,
          facebook_page_access_token = $5,
          facebook_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [
      userId,
      userAccessToken,
      pageId,
      pageName,
      pageAccessToken,
    ]);

    return rows[0] || null;
  },

  async getFacebookConnection(userId) {
    await ensureSocialColumns();

    const sql = `
      SELECT
        id,
        facebook_user_access_token,
        facebook_page_id,
        facebook_page_name,
        facebook_page_access_token,
        facebook_token_updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;

    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },
};

module.exports = userModel;
