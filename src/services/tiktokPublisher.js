const userModel = require('../models/userModel');

/**
 * Core TikTok publish helper.
 * Uses TikTok Content Posting API (Video).
 * Switched to FILE_UPLOAD to avoid URL ownership verification issues.
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

  console.log(`[TikTok] Downloading video from: ${videoUrl}`);
  const videoResp = await fetch(videoUrl);
  if (!videoResp.ok) {
    throw new Error(`Failed to download video from URL: ${videoResp.statusText}`);
  }

  const videoBuffer = await videoResp.arrayBuffer();
  const videoSize = videoBuffer.byteLength;
  console.log(`[TikTok] Video size: ${videoSize} bytes`);

  // TikTok Chunking Rules:
  // - Min 5MB, Max 64MB (except last chunk)
  // - Small files (<5MB) must be 1 chunk
  // - Final chunk can be up to 128MB
  const MAX_CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
  let chunkSize = videoSize;
  let totalChunkCount = 1;

  if (videoSize > 128 * 1024 * 1024) {
    chunkSize = MAX_CHUNK_SIZE;
    totalChunkCount = Math.ceil(videoSize / chunkSize);
  }

  const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
  const initBody = {
    post_info: {
      title: title || '',
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_duet: false,
      disable_stitch: false,
      disable_comment: false,
      video_ad_tag: false,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    },
  };

  console.log('[TikTok] Initializing upload...');
  const initResp = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(initBody),
  });

  const initData = await initResp.json();

  if (!initResp.ok) {
    const details =
      initData?.error?.message ||
      initData?.message ||
      initData?.error?.code ||
      'TikTok init failed';
    throw new Error(details);
  }

  const { upload_url, publish_id } = initData.data;
  console.log(`[TikTok] Upload URL received. Publish ID: ${publish_id}`);

  // Upload chunks
  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, videoSize);
    const chunk = videoBuffer.slice(start, end);

    console.log(`[TikTok] Uploading chunk ${i + 1}/${totalChunkCount} (${chunk.byteLength} bytes)...`);

    const uploadResp = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': chunk.byteLength,
        'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`,
      },
      body: chunk,
    });

    if (!uploadResp.ok) {
      const uploadError = await uploadResp.text();
      console.error(`[TikTok] Chunk ${i + 1} upload failed:`, uploadError);
      throw new Error(`Failed to upload video chunk ${i + 1}: ${uploadResp.statusText}`);
    }
  }

  console.log('[TikTok] Upload complete.');
  return {
    providerPostId: publish_id || null,
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
