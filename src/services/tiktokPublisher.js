const userModel = require('../models/userModel');

/**
 * Core TikTok publish helper.
 * Uses TikTok Content Posting API (Video).
 *
 * @param {object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.videoUrl
 * @param {string} opts.title
 * @returns {Promise<{providerPostId: string|null}>}
 */
const postToTikTok = async ({ accessToken, videoUrl, title }) => {
  if (!accessToken) {
    throw new Error('Missing TikTok access token');
  }

  if (!videoUrl) {
    throw new Error('TikTok post requires a video URL');
  }

  const url = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
  const body = {
    post_info: {
      title: title || '',
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_duet: false,
      disable_stitch: false,
      disable_comment: false,
      video_ad_tag: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const details =
      data?.error?.message ||
      data?.message ||
      data?.error?.code ||
      'TikTok post failed';
    throw new Error(details);
  }

  return {
    providerPostId: data?.data?.publish_id || null,
  };
};

/**
 * Publish a scheduled_posts row to TikTok.
 */
const publishTikTokPost = async (post) => {
  if (!post.content || typeof post.content !== 'object') {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getTikTokConnection(post.user_id);
  const accessToken = String(
    post.content.tiktok_access_token || connection?.tiktok_access_token || ''
  ).trim();

  const title = String(
    post.content.title || post.content.message || post.content.description || ''
  ).trim();

  const videoUrl = String(post.content.media_url || post.content.mediaUrl || '').trim();

  return postToTikTok({ accessToken, videoUrl, title });
};

module.exports = {
  postToTikTok,
  publishTikTokPost,
};
