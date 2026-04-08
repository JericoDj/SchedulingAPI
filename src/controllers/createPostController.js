const asyncHandler = require('../utils/asyncHandler');

const allowedStatuses = ['draft', 'scheduled', 'publishing', 'published', 'failed'];

const parseMetadata = (metadata) => {
  if (metadata === undefined) {
    return undefined;
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch (error) {
      throw new Error('Metadata must be a valid JSON object');
    }
  }

  if (metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }

  throw new Error('Metadata must be a JSON object');
};

const ensureValidDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return value === '' ? null : value;
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid date string`);
  }

  return value;
};

const ensureValidStatus = (status) => {
  if (status === undefined) {
    return undefined;
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return status;
};

const buildPayload = (body, { isCreate = false } = {}) => {
  const payload = {
    title: body.title,
    caption: body.caption,
    media_url: body.media_url,
    platform_account_id: body.platform_account_id,
    scheduled_at: ensureValidDate(body.scheduled_at, 'scheduled_at'),
    published_at: ensureValidDate(body.published_at, 'published_at'),
    ai_prompt: body.ai_prompt,
    metadata: parseMetadata(body.metadata),
    status: ensureValidStatus(body.status),
  };

  if (isCreate && payload.status === undefined) {
    payload.status = payload.scheduled_at ? 'scheduled' : 'draft';
  }

  return payload;
};

const getExistingPost = async (model, id, userId, platformName) => {
  const post = await model.findById(id, userId);

  if (!post) {
    const error = new Error(`${platformName} post not found`);
    error.statusCode = 404;
    throw error;
  }

  return post;
};

const createPostController = (model, platformName) => {
  const getPosts = asyncHandler(async (req, res) => {
    const posts = await model.findAllByUser(req.user.id);
    res.status(200).json(posts);
  });

  const getScheduledPosts = asyncHandler(async (req, res) => {
    const posts = await model.findScheduledByUser(req.user.id);
    res.status(200).json(posts);
  });

  const getPostById = asyncHandler(async (req, res) => {
    const post = await getExistingPost(model, req.params.id, req.user.id, platformName);

    res.status(200).json(post);
  });

  const createPost = asyncHandler(async (req, res) => {
    if (!req.body.caption) {
      res.status(400);
      throw new Error('caption is required');
    }

    const post = await model.create({
      user_id: req.user.id,
      ...buildPayload(req.body, { isCreate: true }),
    });

    res.status(201).json(post);
  });

  const updatePost = asyncHandler(async (req, res) => {
    const updatedPost = await model.update(
      req.params.id,
      req.user.id,
      buildPayload(req.body)
    );

    if (!updatedPost) {
      res.status(404);
      throw new Error(`${platformName} post not found`);
    }

    res.status(200).json(updatedPost);
  });

  const schedulePost = asyncHandler(async (req, res) => {
    const scheduledAt = ensureValidDate(req.body.scheduled_at, 'scheduled_at');

    if (!scheduledAt) {
      res.status(400);
      throw new Error('scheduled_at is required to schedule a post');
    }

    await getExistingPost(model, req.params.id, req.user.id, platformName);

    const scheduledPost = await model.updateStatus(req.params.id, req.user.id, 'scheduled', {
      scheduled_at: scheduledAt,
      published_at: null,
    });

    res.status(200).json({
      message: `${platformName} post scheduled successfully`,
      post: scheduledPost,
    });
  });

  const publishPost = asyncHandler(async (req, res) => {
    const existingPost = await getExistingPost(
      model,
      req.params.id,
      req.user.id,
      platformName
    );

    if (!existingPost.caption) {
      res.status(400);
      throw new Error(`${platformName} post must have a caption before publishing`);
    }

    const publishedAt =
      ensureValidDate(req.body.published_at, 'published_at') || new Date().toISOString();

    const publishedPost = await model.updateStatus(req.params.id, req.user.id, 'published', {
      published_at: publishedAt,
      scheduled_at: null,
      platform_account_id:
        req.body.platform_account_id || existingPost.platform_account_id,
    });

    res.status(200).json({
      message: `${platformName} post marked as published`,
      post: publishedPost,
    });
  });

  const deletePost = asyncHandler(async (req, res) => {
    const deletedPost = await model.delete(req.params.id, req.user.id);

    if (!deletedPost) {
      res.status(404);
      throw new Error(`${platformName} post not found`);
    }

    res.status(200).json({
      message: `${platformName} post deleted successfully`,
      post: deletedPost,
    });
  });

  return {
    getPosts,
    getScheduledPosts,
    getPostById,
    createPost,
    updatePost,
    schedulePost,
    publishPost,
    deletePost,
  };
};

module.exports = createPostController;
