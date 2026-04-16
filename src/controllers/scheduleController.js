const asyncHandler = require('../utils/asyncHandler');
const scheduledPostModel = require('../models/scheduledPostModel');
const { runSchedulerBatch } = require('../services/schedulerService');

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

const schedulePost = asyncHandler(async (req, res) => {
  const platform = String(req.body.platform || '').trim().toLowerCase();
  const scheduledAt = ensureUtcIsoString(req.body.scheduled_at, 'scheduled_at');
  const content = parseContent(req.body.content);

  if (!allowedPlatforms.has(platform)) {
    res.status(400);
    throw new Error(`platform must be one of: ${Array.from(allowedPlatforms).join(', ')}`);
  }

  if (!content.title && !content.description && !content.media_url && !content.mediaUrl) {
    res.status(400);
    throw new Error('content must include at least one of: title, description, media_url');
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

const runScheduler = asyncHandler(async (req, res) => {
  const batchSizeRaw = Number(req.query.batch || 10);
  const batchSize = Number.isInteger(batchSizeRaw)
    ? Math.max(1, Math.min(batchSizeRaw, 50))
    : 10;

  const result = await runSchedulerBatch({ batchSize });
  res.status(200).json({
    message: 'Scheduler run completed',
    batchSize,
    ...result,
    ranAt: new Date().toISOString(),
  });
});

module.exports = {
  schedulePost,
  getScheduledPosts,
  runScheduler,
};
