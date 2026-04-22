const asyncHandler = require('../utils/asyncHandler');
const { publishScheduledPost } = require('../services/platformPublishers');

const publishNow = asyncHandler(async (req, res) => {
  const { platform, content, media_url, media_type } = req.body;

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
      ...req.body.extra_content,
    },
  };

  try {
    const result = await publishScheduledPost(mockPost);
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
