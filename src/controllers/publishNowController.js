const asyncHandler = require('../utils/asyncHandler');
const { publishScheduledPost } = require('../services/platformPublishers');
const { query } = require('../config/db');

const publishNow = asyncHandler(async (req, res) => {
  const { platform, content, media_url, media_type, is_reels, is_shorts } = req.body;

  console.log('[PublishNow] Incoming request:', {
    platform,
    hasContent: !!content,
    hasMediaUrl: !!media_url,
    mediaUrl: media_url ? `${media_url.substring(0, 30)}...` : 'NONE',
    extraKeys: Object.keys(req.body.extra_content || {})
  });

  if (!platform) {
    res.status(400);
    throw new Error('platform is required');
  }

  if (!content && !media_url) {
    res.status(400);
    throw new Error('content or media_url is required');
  }

  // Create a mock post object to pass to the publisher
  const mockPost = {
    user_id: req.user.id,
    platform: platform.toLowerCase(),
    content: {
      message: content,
      description: content,
      media_url: media_url || null,
      media_type: media_type || null,
      is_reels: !!is_reels,
      is_shorts: !!is_shorts,
      ...req.body.extra_content,
    },
  };

  try {
    const result = await publishScheduledPost(mockPost);

    // After successful publish, create a record in the specific platform table (e.g. youtube_posts)
    // so it appears in the frontend list
    const platformTableMap = {
      facebook: 'facebook_posts',
      instagram: 'instagram_posts',
      tiktok: 'tiktok_posts',
      youtube: 'youtube_posts',
      linkedin: 'linkedin_posts',
      threads: 'threads_posts',
      x: 'x_posts'
    };

    const tableName = platformTableMap[platform.toLowerCase()];
    if (tableName) {
      await query(
        `INSERT INTO ${tableName} (user_id, title, caption, media_url, platform_account_id, status, published_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
        [
          req.user.id,
          mockPost.content.title || null,
          mockPost.content.message || mockPost.content.description || '',
          mockPost.content.media_url || null,
          result.providerPostId || null
        ]
      );
    }

    // ALSO add to unified scheduled_posts table so it appears in the main list
    await query(
      `INSERT INTO scheduled_posts (user_id, platform, content, scheduled_at, status, provider_post_id)
       VALUES ($1, $2, $3, NOW(), 'posted', $4)`,
      [
        req.user.id,
        platform.toLowerCase(),
        mockPost.content,
        result.providerPostId || null
      ]
    );

    res.status(200).json({
      message: `Posted to ${platform} successfully`,
      result,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Failed to post to ${platform}: ${error.message}`);
  }
});

module.exports = {
  publishNow,
};
