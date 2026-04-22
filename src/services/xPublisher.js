const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { TwitterApi } = require('twitter-api-v2');

const userModel = require('../models/userModel');
const {
  xConsumerKey,
  xConsumerSecret,
  xAccessToken,
  xAccessTokenSecret,
} = require('../config/env');

const getTweetText = (content) => {
  const text = String(content?.message || content?.description || content?.title || '').trim();
  if (!text) {
    throw new Error('X publish requires text content (message/description/title)');
  }
  return text;
};

const getMediaUrl = (content) => String(content?.media_url || content?.mediaUrl || '').trim();

const extensionForContentType = (contentType = '') => {
  const value = String(contentType).toLowerCase();
  if (value.includes('png')) return '.png';
  if (value.includes('webp')) return '.webp';
  if (value.includes('gif')) return '.gif';
  return '.jpg';
};

const formatXError = (error) => {
  const payload = {
    message: error?.message || String(error),
    code: error?.code || null,
    data: error?.data || null,
    rateLimit: error?.rateLimit || null,
    errors: error?.errors || null,
  };
  return JSON.stringify(payload);
};

const ensureOAuth1MediaConfig = () => {
  if (!xConsumerKey || !xConsumerSecret || !xAccessToken || !xAccessTokenSecret) {
    throw new Error(
      'X media upload requires OAuth 1.0a user credentials. Set X_CONSUMER_KEY (or X_API_KEY), X_CONSUMER_SECRET (or X_API_KEY_SECRET), X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET (or X_ACCESS_SECRET).'
    );
  }
};

const buildOAuth1Client = () => {
  ensureOAuth1MediaConfig();
  return new TwitterApi({
    appKey: xConsumerKey,
    appSecret: xConsumerSecret,
    accessToken: xAccessToken,
    accessSecret: xAccessTokenSecret,
  }).readWrite;
};

const verifyOAuth1Client = async (rwClient) => {
  try {
    const me = await rwClient.v1.verifyCredentials();
    return {
      id: me?.id_str || null,
      username: me?.screen_name || null,
    };
  } catch (error) {
    throw new Error(
      `OAuth1 credential verification failed before media upload: ${formatXError(error)}`
    );
  }
};

const uploadImageToX = async (rwClient, mediaUrl, mediaTypeHint) => {
  const mediaResponse = await fetch(mediaUrl);
  if (!mediaResponse.ok) {
    throw new Error(`Failed to fetch media for X upload: ${mediaResponse.status}`);
  }

  const contentType = mediaResponse.headers.get('content-type') || '';
  const looksLikeImage =
    contentType.toLowerCase().startsWith('image/') ||
    String(mediaTypeHint || '').toLowerCase() === 'image';
  if (!looksLikeImage) {
    throw new Error('X media upload currently supports image posts only');
  }

  const buffer = Buffer.from(await mediaResponse.arrayBuffer());
  const tmpFile = path.join(
    os.tmpdir(),
    `x-upload-${Date.now()}-${crypto.randomUUID()}${extensionForContentType(contentType)}`
  );

  await fs.writeFile(tmpFile, buffer);
  try {
    return await rwClient.v1.uploadMedia(tmpFile, {
      mimeType: contentType || undefined,
      target: 'tweet',
    });
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
};

const publishTextOnlyWithOAuth2 = async (accessToken, text) => {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details =
      data?.errors?.[0]?.detail || data?.detail || data?.title || data?.error || JSON.stringify(data);
    throw new Error(`X publish failed: ${details}`);
  }
  return data;
};

const publishXPost = async (post) => {
  const content = post?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getXConnection(post.user_id);
  if (!connection?.x_access_token) {
    throw new Error('X account is not connected. Reconnect X in Settings.');
  }

  const text = getTweetText(content);
  const mediaUrl = getMediaUrl(content);

  if (!mediaUrl) {
    const tweetData = await publishTextOnlyWithOAuth2(connection.x_access_token, text);
    return {
      providerPostId: tweetData?.data?.id || null,
      username: connection.x_username || null,
      mediaIds: [],
      raw: tweetData,
    };
  }

  if (String(content?.media_type || '').toLowerCase() === 'video') {
    throw new Error('X video upload is not configured yet. Please use image or text-only posts.');
  }

  try {
    const rwClient = buildOAuth1Client();
    const oauth1User = await verifyOAuth1Client(rwClient);
    const mediaId = await uploadImageToX(rwClient, mediaUrl, content?.media_type);
    const tweet = await rwClient.v2.tweet({
      text,
      media: { media_ids: [mediaId] },
    });

    return {
      providerPostId: tweet?.data?.id || null,
      username: connection.x_username || oauth1User?.username || null,
      mediaIds: [mediaId],
      raw: tweet,
    };
  } catch (error) {
    throw new Error(
      `X media publish failed: ${formatXError(error)}. Verify OAuth1 keys/tokens, app Read+Write permissions, regenerated token secrets, and X plan access for media upload.`
    );
  }
};

module.exports = {
  publishXPost,
};
