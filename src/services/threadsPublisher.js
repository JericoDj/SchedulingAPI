const userModel = require('../models/userModel');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatThreadsError = (errorPayload, fallbackMessage) => {
  const apiError = errorPayload?.error;

  if (!apiError) {
    return fallbackMessage;
  }

  const parts = [];

  if (apiError.message) {
    parts.push(apiError.message);
  }

  if (apiError.error_user_title) {
    parts.push(apiError.error_user_title);
  }

  if (apiError.error_user_msg) {
    parts.push(apiError.error_user_msg);
  }

  if (apiError.code) {
    parts.push(`code ${apiError.code}`);
  }

  return parts.join(' | ') || fallbackMessage;
};

const waitForThreadsContainer = async ({ containerId, accessToken, hasMedia }) => {
  if (!hasMedia) {
    return;
  }

  const statusUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(containerId)}?fields=id,status,error_message&access_token=${encodeURIComponent(accessToken)}`;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const statusResponse = await fetch(statusUrl, { method: 'GET' });
    const statusData = await statusResponse.json();
    console.log('Threads Container Status Data:', statusData);

    if (!statusResponse.ok) {
      throw new Error(formatThreadsError(statusData, 'Failed to fetch Threads container status'));
    }

    const normalizedStatus = String(statusData.status || '').toUpperCase();

    if (normalizedStatus === 'FINISHED' || normalizedStatus === 'PUBLISHED') {
      return;
    }

    if (normalizedStatus === 'ERROR' || normalizedStatus === 'EXPIRED') {
      const errorMessage = statusData.error_message
        ? `Threads media processing failed: ${statusData.error_message}`
        : `Threads media processing failed with status: ${normalizedStatus}`;
      throw new Error(errorMessage);
    }

    await sleep(4000);
  }

  throw new Error('Threads media is still processing. Try again in a few moments.');
};

/**
 * Core Threads publish helper.
 * 1. Create a media container (or text container)
 * 2. Publish the container
 *
 * @param {object} opts
 * @param {string} opts.threadsUserId
 * @param {string} opts.accessToken
 * @param {string} opts.text
 * @param {string} [opts.mediaUrl]
 * @param {string} [opts.mediaType] 'image' | 'video'
 * @returns {Promise<{providerPostId: string|null, threadsUserId: string}>}
 */
const postToThreads = async ({ threadsUserId, accessToken, text, mediaUrl, mediaType }) => {
  if (!threadsUserId || !accessToken) {
    throw new Error('Missing Threads credentials');
  }

  if (!text && !mediaUrl) {
    throw new Error('Threads post requires at least text or media URL');
  }

  // 1. Create Container
  const containerUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(threadsUserId)}/threads`;
  const containerParams = new URLSearchParams({
    access_token: accessToken,
  });

  if (mediaUrl) {
    if (mediaType === 'video') {
      containerParams.append('media_type', 'VIDEO');
      containerParams.append('video_url', mediaUrl);
    } else {
      containerParams.append('media_type', 'IMAGE');
      containerParams.append('image_url', mediaUrl);
    }
    if (text) containerParams.append('text', text);
  } else {
    // Text-only post
    containerParams.append('media_type', 'TEXT');
    if (text) containerParams.append('text', text);
  }

  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: containerParams,
  });

  const containerData = await containerResponse.json();
  console.log('Threads Container Data:', containerData);

  if (!containerResponse.ok) {
    throw new Error(formatThreadsError(containerData, 'Threads container creation failed'));
  }

  const containerId = containerData.id;

  await waitForThreadsContainer({
    containerId,
    accessToken,
    hasMedia: !!mediaUrl,
  });

  // 2. Publish Container
  const publishUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(threadsUserId)}/threads_publish`;
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
  console.log('Threads Publish Data:', publishData);

  if (!publishResponse.ok) {
    throw new Error(formatThreadsError(publishData, 'Threads publish failed'));
  }

  return {
    providerPostId: publishData.id || null,
    threadsUserId,
  };
};

/**
 * Publish a scheduled_posts row to Threads.
 */
const publishThreadsPost = async (post) => {
  if (!post.content || typeof post.content !== 'object') {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getThreadsConnection(post.user_id);
  const threadsUserId = String(
    post.content.threads_user_id || connection?.threads_user_id || ''
  ).trim();
  const accessToken = String(
    post.content.threads_access_token || connection?.threads_access_token || ''
  ).trim();

  const text = String(
    post.content.text || post.content.message || post.content.description || ''
  ).trim();

  const mediaUrl = String(post.content.media_url || post.content.mediaUrl || '').trim();
  const mediaType = String(post.content.media_type || '').trim().toLowerCase();

  return postToThreads({ threadsUserId, accessToken, text, mediaUrl, mediaType });
};

module.exports = {
  postToThreads,
  publishThreadsPost,
};
