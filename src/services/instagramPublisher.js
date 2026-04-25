const userModel = require('../models/userModel');
const { graphApiVersion } = require('../config/env');

/**
 * Core Instagram publish helper.
 * 1. Create a media container
 * 2. Publish the container
 *
 * @param {object} opts
 * @param {string} opts.instagramBusinessAccountId
 * @param {string} opts.accessToken
 * @param {string} opts.caption
 * @param {string} opts.mediaUrl
 * @param {string} [opts.mediaType] 'image' | 'video'
 * @returns {Promise<{providerPostId: string|null, instagramBusinessAccountId: string}>}
 */
const postToInstagram = async ({ instagramBusinessAccountId, accessToken, caption, mediaUrl, mediaType }) => {
  if (!instagramBusinessAccountId || !accessToken) {
    throw new Error('Missing Instagram credentials');
  }

  if (!mediaUrl) {
    throw new Error('Instagram post requires a media URL (image or video)');
  }

  // 1. Create Media Container
  const containerUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media`;
  const containerParams = new URLSearchParams({
    access_token: accessToken,
    caption: caption || '',
  });

  if (mediaType === 'video') {
    containerParams.append('media_type', opts.isReels ? 'REELS' : 'VIDEO');
    containerParams.append('video_url', mediaUrl);
  } else {
    containerParams.append('image_url', mediaUrl);
  }

  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: containerParams,
  });

  const containerData = await containerResponse.json();

  if (!containerResponse.ok) {
    throw new Error(containerData?.error?.message || 'Instagram media container creation failed');
  }

  const containerId = containerData.id;

  // Wait a bit for video processing if needed (simplistic approach)
  if (mediaType === 'video') {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // 2. Publish Container
  const publishUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media_publish`;
  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams,
  });

  const publishData = await publishResponse.json();

  if (!publishResponse.ok) {
    throw new Error(publishData?.error?.message || 'Instagram media publish failed');
  }

  return {
    providerPostId: publishData.id || null,
    instagramBusinessAccountId,
  };
};

/**
 * Publish a scheduled_posts row to Instagram.
 */
const publishInstagramPost = async (post) => {
  if (!post.content || typeof post.content !== 'object') {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getInstagramConnection(post.user_id);
  const instagramBusinessAccountId = String(
    post.content.instagram_business_account_id || connection?.instagram_business_account_id || ''
  ).trim();
  const accessToken = String(
    post.content.instagram_access_token || connection?.instagram_access_token || ''
  ).trim();

  const caption = String(
    post.content.caption || post.content.message || post.content.description || ''
  ).trim();

  const mediaUrl = String(post.content.media_url || post.content.mediaUrl || '').trim();
  const mediaType = String(post.content.media_type || '').trim().toLowerCase();
  const isReels = !!post.content.is_reels;

  return postToInstagram({ instagramBusinessAccountId, accessToken, caption, mediaUrl, mediaType, isReels });
};

module.exports = {
  postToInstagram,
  publishInstagramPost,
};
