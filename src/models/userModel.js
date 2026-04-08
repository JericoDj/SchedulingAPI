const { query } = require('../config/db');

const publicUserFields = `
  id,
  name,
  email,
  avatar_url,
  role,
  created_at,
  updated_at
`;

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
    const sql = `
      INSERT INTO users (name, email, password_hash, avatar_url, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [name, email, passwordHash, avatar_url, role]);
    return rows[0];
  },

  async findAll() {
    const sql = `
      SELECT ${publicUserFields}
      FROM users
      ORDER BY created_at DESC
    `;

    const { rows } = await query(sql);
    return rows;
  },

  async findById(id) {
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
    const sql = `
      SELECT
        id,
        name,
        email,
        avatar_url,
        role,
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
    const sql = `
      DELETE FROM users
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;

    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  },
};

module.exports = userModel;
