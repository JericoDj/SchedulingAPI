const userModel = require('../models/userModel');
const { graphApiVersion } = require('../config/env');

/**
 * Core Facebook publish helper.
 * Picks the correct Graph API endpoint based on media type:
 *   - video  → /{pageId}/videos   (url + description + access_token)
 *   - image  → /{pageId}/photos   (url + caption + access_token)
 *   - text   → /{pageId}/feed     (message + access_token)
 *
 * @param {object} opts
 * @param {string} opts.pageId
 * @param {string} opts.pageAccessToken
 * @param {string} opts.message         Caption / description / text
 * @param {string} [opts.mediaUrl]      Public URL to the image or video
 * @param {string} [opts.mediaType]     'image' | 'video'
 * @returns {Promise<{providerPostId: string|null, pageId: string, endpoint: string}>}
 */
const postToFacebook = async ({ pageId, pageAccessToken, message, mediaUrl, mediaType }) => {
  if (!pageId || !pageAccessToken) {
    throw new Error('Missing Facebook page credentials');
  }

  if (!message && !mediaUrl) {
    throw new Error('Facebook post requires at least a message or media URL');
  }

  const body = new URLSearchParams({ access_token: pageAccessToken });
  let endpoint;

  if (mediaUrl && mediaType === 'video') {
    if (opts.isReels) {
      // Facebook Reels post
      endpoint = 'video_reels';
      body.append('video_state', 'PUBLISHED');
      body.append('description', message);
      body.append('file_url', mediaUrl);
    } else {
      // Standard Video post
      endpoint = 'videos';
      body.append('url', mediaUrl);
      if (message) body.append('caption', message);
    }
  } else if (mediaUrl) {
    // Photo post
    endpoint = 'photos';
    body.append('url', mediaUrl);
    if (message) body.append('caption', message);
  } else {
    // Text-only feed post
    endpoint = 'feed';
    body.append('message', message);
  }

  const graphUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/${endpoint}`;

  const response = await fetch(graphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Facebook ${endpoint} post failed`);
  }

  return {
    providerPostId: data?.id || null,
    pageId,
    endpoint,
  };
};

/**
 * Publish a scheduled_posts row to Facebook.
 * Called by the scheduler worker.
 */
const publishFacebookPost = async (post) => {
  if (!post.content || typeof post.content !== 'object') {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getFacebookConnection(post.user_id);
  const pageId = String(post.content.facebook_page_id || connection?.facebook_page_id || '').trim();
  const pageAccessToken = String(
    post.content.facebook_page_access_token || connection?.facebook_page_access_token || ''
  ).trim();

  const message = String(
    post.content.message || post.content.description || post.content.title || ''
  ).trim();

  const mediaUrl = String(post.content.media_url || post.content.mediaUrl || '').trim();
  const mediaType = String(post.content.media_type || '').trim().toLowerCase();
  const isReels = !!post.content.is_reels;

  return postToFacebook({ pageId, pageAccessToken, message, mediaUrl, mediaType, isReels });
};

/**
 * Immediately publish a Facebook post from an API request.
 * Called by POST /api/facebook-posts/publish-now
 */
const publishNow = async (req, res, next) => {
  try {
    const connection = await userModel.getFacebookConnection(req.user.id);

    if (!connection?.facebook_page_id || !connection?.facebook_page_access_token) {
      return res.status(400).json({
        error: 'No Facebook page connected. Go to Settings and connect your Facebook page first.',
      });
    }

    const { message, media_url, media_type } = req.body;

    if (!message && !media_url) {
      return res.status(400).json({ error: 'message or media_url is required' });
    }

    const result = await postToFacebook({
      pageId: connection.facebook_page_id,
      pageAccessToken: connection.facebook_page_access_token,
      message: String(message || '').trim(),
      mediaUrl: String(media_url || '').trim(),
      mediaType: String(media_type || '').trim().toLowerCase(),
      isReels: !!req.body.is_reels,
    });

    res.status(200).json({
      message: 'Posted to Facebook successfully',
      providerPostId: result.providerPostId,
      pageId: result.pageId,
      endpoint: result.endpoint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postToFacebook,
  publishFacebookPost,
  publishNow,
};
