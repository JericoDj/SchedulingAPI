const userModel = require('../models/userModel');
const { graphApiVersion } = require('../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createInstagramContainer = async ({ instagramBusinessAccountId, accessToken, caption, mediaUrl, mediaType, isReels }) => {
  const containerUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media`;
  const containerParams = new URLSearchParams({
    access_token: accessToken,
  });

  if (caption) {
    containerParams.append('caption', caption);
  }

  if (mediaType === 'video') {
    containerParams.append('media_type', isReels ? 'REELS' : 'VIDEO');
    containerParams.append('video_url', mediaUrl);

    if (isReels) {
      containerParams.append('share_to_feed', 'true');
    }
  } else {
    containerParams.append('image_url', mediaUrl);
  }

  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: containerParams,
  });

  const containerData = await containerRes.json();
  console.log('Instagram Container Data:', containerData);

  if (!containerRes.ok) {
    throw new Error(containerData?.error?.message || 'Instagram container creation failed');
  }

  return containerData.id;
};

const waitForInstagramContainer = async ({ creationId, instagramBusinessAccountId, accessToken, mediaType }) => {
  if (mediaType !== 'video') {
    return;
  }

  const statusUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(creationId)}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const statusRes = await fetch(statusUrl, { method: 'GET' });
    const statusData = await statusRes.json();
    console.log('Instagram Container Status Data:', statusData);

    if (!statusRes.ok) {
      throw new Error(statusData?.error?.message || 'Failed to fetch Instagram container status');
    }

    const normalizedStatus = String(statusData.status_code || statusData.status || '').toUpperCase();

    if (normalizedStatus === 'FINISHED' || normalizedStatus === 'PUBLISHED') {
      return;
    }

    if (normalizedStatus === 'ERROR' || normalizedStatus === 'EXPIRED') {
      throw new Error(`Instagram video processing failed with status: ${normalizedStatus}`);
    }

    await sleep(4000);
  }

  throw new Error('Instagram video is still processing. Try again in a few moments.');
};

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
const postToInstagram = async ({ instagramBusinessAccountId, accessToken, caption, mediaUrl, mediaType, isReels }) => {
  if (!instagramBusinessAccountId || instagramBusinessAccountId === 'undefined' || instagramBusinessAccountId === '') {
    throw new Error('Missing or invalid Instagram Business Account ID');
  }
  if (!accessToken) {
    throw new Error('Missing Instagram access token');
  }

  if (!mediaUrl) {
    throw new Error('Instagram post requires a media URL (image or video)');
  }

  let containerId;

  containerId = await createInstagramContainer({
    instagramBusinessAccountId,
    accessToken,
    caption,
    mediaUrl,
    mediaType,
    isReels,
  });

  await waitForInstagramContainer({
    creationId: containerId,
    instagramBusinessAccountId,
    accessToken,
    mediaType,
  });

  // 3. Publish Container
  const publishUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media_publish`;
  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });

  const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
    method: 'POST',
  });

  const publishData = await publishResponse.json();
  if (!publishResponse.ok) throw new Error(publishData?.error?.message || 'Instagram media publish failed');

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
  
  // Be lenient with key names (handle underscores, spaces, and camelCase)
  const instagramBusinessAccountId = (
    post.content.instagram_business_account_id || 
    post.content.instagramBusinessAccountId || 
    post.content['instagram access token id'] ||
    post.content['instagram_business_id'] ||
    connection?.instagram_business_account_id ||
    ''
  ).toString().trim();

  const accessToken = (
    post.content.instagram_access_token || 
    post.content.instagramAccessToken || 
    post.content['instagram access token'] ||
    connection?.instagram_access_token ||
    ''
  ).toString().trim();

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
