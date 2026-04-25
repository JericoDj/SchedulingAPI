const userModel = require('../models/userModel');
const { query } = require('../config/db');

/**
 * Ensures we have a valid YouTube access token, refreshing it if necessary.
 */
const getValidYouTubeToken = async (userId) => {
  const connection = await userModel.getYouTubeConnection(userId);
  if (!connection?.youtube_access_token) return null;

  // Check if token is potentially expired (Google tokens last 1 hour)
  const lastUpdated = connection.youtube_token_updated_at ? new Date(connection.youtube_token_updated_at).getTime() : 0;
  const now = Date.now();
  const diffMinutes = (now - lastUpdated) / (1000 * 60);

  // If younger than 50 mins, use current one
  if (diffMinutes < 50) {
    return connection.youtube_access_token;
  }

  // Otherwise, refresh it using the refresh_token
  if (!connection.youtube_refresh_token) {
    return connection.youtube_access_token; // Fallback to current and hope for the best
  }

  console.log(`Refreshing YouTube token for user ${userId}...`);
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_YOUTUBE_OAUTH_SOCIALSYNC_CLIENT_ID,
      client_secret: process.env.GOOGLE_YOUTUBE_OAUTH_SOCIALSYNC_CLIENT_SECRET,
      refresh_token: connection.youtube_refresh_token,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.access_token) {
      await query(
        `UPDATE users SET youtube_access_token = $1, youtube_token_updated_at = NOW() WHERE id = $2`,
        [data.access_token, userId]
      );
      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh YouTube token:', error);
  }

  return connection.youtube_access_token;
};

/**
 * Core YouTube publish helper.
 * Uses YouTube Data API v3 for resumable video upload.
 *
 * @param {object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.videoUrl
 * @param {string} opts.title
 * @param {string} opts.description
 * @returns {Promise<{providerPostId: string|null}>}
 */
const postToYouTube = async ({ accessToken, videoUrl, title, description }) => {
  if (!accessToken) {
    throw new Error('Missing YouTube credentials');
  }

  if (!videoUrl) {
    throw new Error('YouTube post requires a video URL');
  }

  // 1. Fetch video as stream/buffer
  const mediaResponse = await fetch(videoUrl);
  if (!mediaResponse.ok) {
    throw new Error('Failed to fetch media for YouTube upload');
  }
  const videoBuffer = await mediaResponse.arrayBuffer();

  // 2. Initiate Resumable Upload
  const initUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
  const initBody = {
    snippet: {
      title: title || 'Social Sync Upload',
      description: description || '',
    },
    status: {
      privacyStatus: 'public',
    },
  };

  const initResponse = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': String(videoBuffer.byteLength),
      'X-Upload-Content-Type': mediaResponse.headers.get('content-type') || 'video/mp4',
    },
    body: JSON.stringify(initBody),
  });

  if (!initResponse.ok) {
    const errorData = await initResponse.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to initialize YouTube upload session');
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Did not receive upload URL from YouTube API');
  }

  // 3. Upload Video Data
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  const uploadData = await uploadResponse.json();

  if (!uploadResponse.ok) {
    throw new Error(uploadData?.error?.message || 'Failed to upload video data to YouTube');
  }

  return {
    providerPostId: uploadData.id || null,
  };
};

/**
 * Publish a scheduled_posts row to YouTube.
 */
const publishYouTubePost = async (post) => {
  if (!post.content || typeof post.content !== 'object') {
    throw new Error('content must be a JSON object');
  }

  const accessToken = await getValidYouTubeToken(post.user_id);
  
  if (!accessToken) {
    throw new Error('No YouTube account connected or credentials invalid.');
  }

  // LOGGING FOR DEBUGGING
  console.log('[YouTube Worker] Processing Post:', {
    id: post.id,
    userId: post.user_id,
    contentKeys: Object.keys(post.content || {})
  });

  let title = String(
    post.content.title || ''
  ).trim() || 'Untitled Video';

  const isShorts = !!(post.content.is_shorts || post.content.extra_content?.is_shorts);
  if (isShorts && !title.toLowerCase().includes('#shorts')) {
    title = `${title} #Shorts`;
  }

  const description = String(
    post.content.caption || post.content.message || post.content.description || ''
  ).trim();

  // Try multiple common field names for the media URL, including nested extra_content
  const videoUrl = String(
    post.content.media_url || 
    post.content.mediaUrl || 
    post.content.video_url || 
    post.content.url || 
    post.content.extra_content?.media_url ||
    post.content.extra_content?.mediaUrl ||
    ''
  ).trim();

  if (!videoUrl) {
    console.error('[YouTube Worker] CRITICAL ERROR: Video URL is missing!');
    console.error('[YouTube Worker] Full Content Received:', JSON.stringify(post.content, null, 2));
    throw new Error('YouTube post requires a video URL');
  }

  console.log('[YouTube Worker] URL Found:', videoUrl.substring(0, 50) + '...');

  return postToYouTube({ accessToken, videoUrl, title, description });
};

/**
 * Immediately publish a YouTube post from an API request.
 * Called by POST /api/youtube-posts/publish-now
 */
const publishNow = async (req, res, next) => {
  try {
    const accessToken = await getValidYouTubeToken(req.user.id);

    if (!accessToken) {
      return res.status(400).json({
        error: 'No YouTube account connected. Go to Settings and connect your account first.',
      });
    }

    const { content, media_url, extra_content } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'content or media_url is required' });
    }

    let title = String(extra_content?.title || '').trim() || 'Untitled Video';
    const isShorts = !!(req.body.is_shorts || extra_content?.is_shorts);
    
    if (isShorts && !title.toLowerCase().includes('#shorts')) {
      title = `${title} #Shorts`;
    }

    const description = String(content || extra_content?.description || '').trim();
    
    const videoUrl = String(
      media_url || 
      extra_content?.media_url || 
      extra_content?.mediaUrl || 
      ''
    ).trim();

    const result = await postToYouTube({
      accessToken,
      videoUrl,
      title,
      description,
    });

    res.status(200).json({
      message: 'Posted to YouTube successfully',
      providerPostId: result.providerPostId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postToYouTube,
  publishYouTubePost,
  publishNow,
};
