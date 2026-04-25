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

  if (mediaType === 'video') {
    // --- DIRECT BYTE UPLOAD (RESUMABLE) FOR INSTAGRAM ---
    
    // 1. Initialize Upload Session
    const initUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media`;
    const initBody = new URLSearchParams({
      access_token: accessToken,
      upload_type: 'resumable',
      media_type: isReels ? 'REELS' : 'VIDEO',
    });

    const initRes = await fetch(initUrl, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: initBody,
    });
    const initData = await initRes.json();
    console.log('Instagram Init Data:', initData);
    if (!initRes.ok) throw new Error(initData?.error?.message || 'Instagram upload initialization failed');
    
    const uploadId = initData.upload_id || initData.id;
    let uploadUrl = initData.uri; // Use the URI provided by Instagram
    
    // Some upload servers prefer the token in the URL
    if (uploadUrl && !uploadUrl.includes('access_token')) {
      const separator = uploadUrl.includes('?') ? '&' : '?';
      uploadUrl += `${separator}access_token=${accessToken}`;
    }

    // 2. Download Video from Firebase
    const videoFetch = await fetch(mediaUrl);
    if (!videoFetch.ok) throw new Error('Failed to download video from Firebase');
    const videoArrayBuffer = await videoFetch.arrayBuffer();
    const videoSize = videoArrayBuffer.byteLength;

    // 3. Upload Bytes to the session
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'Offset': '0',
        'Content-Type': 'application/octet-stream',
        'X-Entity-Length': videoSize.toString(),
        'X-Entity-Type': 'video/mp4',
        'X-Entity-Name': 'video.mp4',
      },
      body: videoArrayBuffer,
    });
    const uploadData = await uploadRes.json();
    console.log('Instagram Byte Upload Data:', uploadData);
    if (!uploadRes.ok) throw new Error(uploadData?.error?.message || 'Instagram byte upload failed');

    // 4. Create Media Container from Uploaded Handle
    const containerUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media`;
    const containerParams = new URLSearchParams({
      access_token: accessToken,
      caption: caption || '',
      media_type: isReels ? 'REELS' : 'VIDEO',
      upload_handle: uploadData.h,
    });
    
    if (isReels) {
      containerParams.append('share_to_feed', 'true');
    }

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    });
    const containerData = await containerRes.json();
    console.log('Instagram Container Data:', containerData);
    if (!containerRes.ok) throw new Error(containerData?.error?.message || 'Instagram container creation failed');
    
    containerId = containerData.id;

  } else {
    // --- URL-BASED UPLOAD FOR IMAGES (Usually works fine) ---
    const containerUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(instagramBusinessAccountId)}/media`;
    const containerParams = new URLSearchParams({
      access_token: accessToken,
      caption: caption || '',
      image_url: mediaUrl,
    });

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams,
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok) throw new Error(containerData?.error?.message || 'Instagram image container creation failed');
    
    containerId = containerData.id;
  }

  // 5. Wait a bit for processing
  if (mediaType === 'video') {
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  // 6. Publish Container
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
