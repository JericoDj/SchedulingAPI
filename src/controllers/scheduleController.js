const asyncHandler = require('../utils/asyncHandler');
const scheduledPostModel = require('../models/scheduledPostModel');
const userModel = require('../models/userModel');
const { runSchedulerBatch } = require('../services/schedulerService');
const { query } = require('../config/db');

const allowedPlatforms = new Set([
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'threads',
  'x',
  'youtube',
  'pinterest',
]);

const parseContent = (content) => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (_) {
      throw new Error('content must be valid JSON');
    }
  }

  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('content must be a JSON object');
  }

  return content;
};

const ensureTimezone = (value) => {
  const timezone = String(value || '').trim();
  if (!timezone) {
    throw new Error('schedule_timezone is required');
  }
  return timezone;
};

const ensureUtcIsoString = (value, fieldName) => {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required`);
  }

  if (!/(Z|[+\-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error(`${fieldName} must include UTC timezone (example: 2026-04-22T09:30:00.000Z)`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO datetime`);
  }

  return date.toISOString();
};

const resolveScheduledAtUtc = async ({ scheduledAt, scheduledLocal, scheduleTimezone }) => {
  if (scheduledAt) {
    return ensureUtcIsoString(scheduledAt, 'scheduled_at');
  }

  const timezone = ensureTimezone(scheduleTimezone);
  const localValue = String(scheduledLocal || '').trim();

  if (!localValue) {
    throw new Error('scheduled_local is required when scheduled_at is not provided');
  }

  const parsed = await query(
    `SELECT ($1::timestamp AT TIME ZONE $2) AS scheduled_utc`,
    [localValue, timezone]
  );

  const utcDate = parsed.rows?.[0]?.scheduled_utc;

  if (!utcDate) {
    throw new Error('Unable to resolve scheduled time for provided timezone');
  }

  return new Date(utcDate).toISOString();
};

const schedulePost = asyncHandler(async (req, res) => {
  const platform = String(req.body.platform || '').trim().toLowerCase();
  const scheduledAt = await resolveScheduledAtUtc({
    scheduledAt: req.body.scheduled_at,
    scheduledLocal: req.body.scheduled_local,
    scheduleTimezone: req.body.schedule_timezone,
  });
  const content = parseContent(req.body.content);
  const scheduleTimezone = req.body.schedule_timezone ? ensureTimezone(req.body.schedule_timezone) : null;
  const scheduledLocal = req.body.scheduled_local ? String(req.body.scheduled_local).trim() : null;

  if (!allowedPlatforms.has(platform)) {
    res.status(400);
    throw new Error(`platform must be one of: ${Array.from(allowedPlatforms).join(', ')}`);
  }

  if (!content.title && !content.description && !content.media_url && !content.mediaUrl) {
    res.status(400);
    throw new Error('content must include at least one of: title, description, media_url');
  }

  if (platform === 'facebook') {
    const connection = await userModel.getFacebookConnection(req.user.id);
    const hasInlineCredentials =
      !!content.facebook_page_id && !!content.facebook_page_access_token;
    const hasSavedCredentials =
      !!connection?.facebook_page_id && !!connection?.facebook_page_access_token;

    if (!hasInlineCredentials && !hasSavedCredentials) {
      res.status(400);
      throw new Error(
        'Facebook scheduling requires a connected page. Connect Facebook in Settings first.'
      );
    }
  }

  if (scheduleTimezone) {
    content.schedule_timezone = scheduleTimezone;
  }

  if (scheduledLocal) {
    content.scheduled_local = scheduledLocal;
  }

  const scheduledPost = await scheduledPostModel.create({
    user_id: req.user.id,
    platform,
    content,
    scheduled_at: scheduledAt,
  });

  res.status(201).json(scheduledPost);
});

const getScheduledPosts = asyncHandler(async (req, res) => {
  const posts = await scheduledPostModel.findAllByUser(req.user.id);
  res.status(200).json(posts);
});

const runSchedulerWorker = asyncHandler(async (req, res) => {
  const batchSizeRaw = Number(req.query.batch || 10);
  const batchSize = Number.isInteger(batchSizeRaw)
    ? Math.max(1, Math.min(batchSizeRaw, 50))
    : 10;

  const result = await runSchedulerBatch({ batchSize });

  res.status(200).json({
    message: 'Worker scheduler run completed',
    batchSize,
    ...result,
    ranAt: new Date().toISOString(),
  });
});

const getWorkerDbHealth = asyncHandler(async (req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.status(200).json({
      status: 'ok',
      dbReachable: true,
      checkedAt: new Date().toISOString(),
      dbTime: rows?.[0]?.now || null,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      dbReachable: false,
      checkedAt: new Date().toISOString(),
      message: error?.message || 'Database health check failed',
      code: error?.code || null,
      cause: error?.sourceError?.code || null,
    });
  }
});

module.exports = {
  schedulePost,
  getScheduledPosts,
  runSchedulerWorker,
  getWorkerDbHealth,
};
