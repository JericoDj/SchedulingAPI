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
  linkedin_member_id,
  linkedin_member_name,
  linkedin_organization_id,
  linkedin_organization_name,
  linkedin_default_author_type,
  linkedin_token_updated_at,
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
    ADD COLUMN IF NOT EXISTS facebook_token_updated_at TIMESTAMPTZ,
    
    ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
    ADD COLUMN IF NOT EXISTS instagram_business_account_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS instagram_token_updated_at TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS tiktok_open_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tiktok_access_token TEXT,
    ADD COLUMN IF NOT EXISTS tiktok_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS tiktok_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tiktok_token_updated_at TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS linkedin_member_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_member_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linkedin_token_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS linkedin_organization_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linkedin_organization_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linkedin_default_author_type VARCHAR(20) DEFAULT 'personal',

    ADD COLUMN IF NOT EXISTS threads_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS threads_access_token TEXT,
    ADD COLUMN IF NOT EXISTS threads_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS threads_token_updated_at TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS x_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS x_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS x_access_token TEXT,
    ADD COLUMN IF NOT EXISTS x_token_updated_at TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS youtube_access_token TEXT,
    ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS youtube_channel_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS youtube_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS youtube_token_updated_at TIMESTAMPTZ
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
        instagram_business_account_id,
        tiktok_open_id,
        threads_user_id,
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

  async saveInstagramConnection(userId, { accessToken, businessAccountId, username, instagramUserId }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET instagram_access_token = $2,
          instagram_business_account_id = $3,
          instagram_username = $4,
          instagram_user_id = $5,
          instagram_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, businessAccountId, username, instagramUserId]);
    return rows[0] || null;
  },

  async getInstagramConnection(userId) {
    await ensureSocialColumns();
    const sql = `SELECT id, instagram_access_token, instagram_business_account_id, instagram_username, instagram_user_id FROM users WHERE id = $1`;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },

  async saveTikTokConnection(userId, { accessToken, refreshToken, openId, username }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET tiktok_access_token = $2,
          tiktok_refresh_token = $3,
          tiktok_open_id = $4,
          tiktok_username = $5,
          tiktok_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, refreshToken, openId, username]);
    return rows[0] || null;
  },

  async getTikTokConnection(userId) {
    await ensureSocialColumns();
    const sql = `SELECT id, tiktok_access_token, tiktok_refresh_token, tiktok_open_id, tiktok_username FROM users WHERE id = $1`;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },

  async saveLinkedInConnection(userId, { accessToken, memberId, memberName }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET linkedin_access_token = $2,
          linkedin_member_id = $3,
          linkedin_member_name = $4,
          linkedin_default_author_type = COALESCE(linkedin_default_author_type, 'personal'),
          linkedin_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, memberId, memberName]);
    return rows[0] || null;
  },

  async getLinkedInConnection(userId) {
    await ensureSocialColumns();
    const sql = `
      SELECT
        id,
        linkedin_access_token,
        linkedin_member_id,
        linkedin_member_name,
        linkedin_organization_id,
        linkedin_organization_name,
        linkedin_default_author_type
      FROM users
      WHERE id = $1
    `;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },

  async saveLinkedInPublishingTarget(userId, { authorType, organizationId, organizationName }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET linkedin_default_author_type = $2,
          linkedin_organization_id = $3,
          linkedin_organization_name = $4
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [
      userId,
      authorType,
      organizationId || null,
      organizationName || null,
    ]);
    return rows[0] || null;
  },

  async saveThreadsConnection(userId, { accessToken, threadsUserId, username }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET threads_access_token = $2,
          threads_user_id = $3,
          threads_username = $4,
          threads_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, threadsUserId, username]);
    return rows[0] || null;
  },

  async getThreadsConnection(userId) {
    await ensureSocialColumns();
    const sql = `SELECT id, threads_access_token, threads_user_id, threads_username FROM users WHERE id = $1`;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },

  async saveXConnection(userId, { accessToken, xUserId, username }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET x_access_token = $2,
          x_user_id = $3,
          x_username = $4,
          x_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, xUserId, username]);
    return rows[0] || null;
  },

  async getXConnection(userId) {
    await ensureSocialColumns();
    const sql = `SELECT id, x_access_token, x_user_id, x_username FROM users WHERE id = $1`;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },

  async saveYouTubeConnection(userId, { accessToken, refreshToken, channelId, username }) {
    await ensureSocialColumns();
    const sql = `
      UPDATE users
      SET youtube_access_token = $2,
          youtube_refresh_token = $3,
          youtube_channel_id = $4,
          youtube_username = $5,
          youtube_token_updated_at = NOW()
      WHERE id = $1
      RETURNING ${publicUserFields}
    `;
    const { rows } = await query(sql, [userId, accessToken, refreshToken, channelId, username]);
    return rows[0] || null;
  },

  async getYouTubeConnection(userId) {
    await ensureSocialColumns();
    const sql = `SELECT id, youtube_access_token, youtube_refresh_token, youtube_channel_id, youtube_username, youtube_token_updated_at FROM users WHERE id = $1`;
    const { rows } = await query(sql, [userId]);
    return rows[0] || null;
  },
};

module.exports = userModel;
