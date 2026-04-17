const normalizePlatform = (platform) => String(platform || '').trim().toLowerCase();
const userModel = require('../models/userModel');
const { graphApiVersion } = require('../config/env');

const ensureContentObject = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('content must be a JSON object');
  }
};

const publishUsingExistingFlow = async (post) => {
  ensureContentObject(post.content);

  // Existing platform route logic currently stores/updates post lifecycle state.
  // This scheduler reuses that lifecycle approach and marks scheduled jobs as posted.
  return {
    providerPostId: null,
    note: 'Publish integration placeholder - external API publish can be plugged in here.',
  };
};

const publishFacebookTextPost = async (post) => {
  ensureContentObject(post.content);

  const connection = await userModel.getFacebookConnection(post.user_id);
  const pageId =
    String(post.content.facebook_page_id || connection?.facebook_page_id || '').trim();
  const pageAccessToken =
    String(
      post.content.facebook_page_access_token || connection?.facebook_page_access_token || ''
    ).trim();

  if (!pageId || !pageAccessToken) {
    throw new Error('Missing Facebook page connection for scheduler publish');
  }

  const message = String(
    post.content.message || post.content.description || post.content.title || ''
  ).trim();

  if (!message) {
    throw new Error('Facebook scheduled post requires message/description/title content');
  }

  const publishUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
    pageId
  )}/feed`;

  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      message,
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Facebook publish failed');
  }

  return {
    providerPostId: data?.id || null,
    pageId,
  };
};

const publishers = {
  facebook: publishFacebookTextPost,
  instagram: publishUsingExistingFlow,
  tiktok: publishUsingExistingFlow,
  linkedin: publishUsingExistingFlow,
  threads: publishUsingExistingFlow,
  x: publishUsingExistingFlow,
  youtube: publishUsingExistingFlow,
  pinterest: publishUsingExistingFlow,
};

const publishScheduledPost = async (post) => {
  const platform = normalizePlatform(post.platform);
  const publisher = publishers[platform];

  if (!publisher) {
    throw new Error(`Unsupported platform: ${post.platform}`);
  }

  return publisher(post);
};

module.exports = {
  publishScheduledPost,
};
