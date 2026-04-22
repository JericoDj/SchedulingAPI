const userModel = require('../models/userModel');

const getPostText = (content) => {
  const text = String(content?.message || content?.description || content?.title || '').trim();
  if (!text) {
    throw new Error('LinkedIn publish requires text content (message/description/title)');
  }
  return text;
};

const getMediaUrl = (content) => String(content?.media_url || content?.mediaUrl || '').trim();

const getContentTypeFromUrl = async (mediaUrl) => {
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch LinkedIn media: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());

  return { contentType, buffer };
};

const registerLinkedInImageUpload = async ({ accessToken, ownerUrn }) => {
  const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: ownerUrn,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
        supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
      },
    }),
  });

  const rawBody = await response.text();
  let data = {};
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch (_) {
    data = { rawBody };
  }

  if (!response.ok) {
    const message = data?.message || rawBody || 'LinkedIn registerUpload failed';
    throw new Error(`LinkedIn register upload failed: ${message}`);
  }

  const uploadUrl =
    data?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      ?.uploadUrl || null;
  const assetUrn = data?.value?.asset || null;

  if (!uploadUrl || !assetUrn) {
    throw new Error('LinkedIn register upload succeeded but uploadUrl/asset URN is missing');
  }

  return { uploadUrl, assetUrn };
};

const uploadLinkedInImageBinary = async ({ uploadUrl, accessToken, contentType, buffer }) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    throw new Error(`LinkedIn media binary upload failed: ${response.status} ${rawBody}`.trim());
  }
};

const publishLinkedInPost = async (post) => {
  const content = post?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('content must be a JSON object');
  }

  const connection = await userModel.getLinkedInConnection(post.user_id);
  if (!connection?.linkedin_access_token || !connection?.linkedin_member_id) {
    throw new Error('LinkedIn account is not connected. Reconnect LinkedIn in Settings.');
  }

  const text = getPostText(content);
  const authorType = String(
    content?.linkedin_author_type || connection.linkedin_default_author_type || 'personal'
  )
    .trim()
    .toLowerCase();
  const requestedOrgId = String(
    content?.linkedin_organization_id || connection.linkedin_organization_id || ''
  ).trim();

  const authorUrn =
    authorType === 'page'
      ? requestedOrgId
        ? `urn:li:organization:${requestedOrgId}`
        : null
      : `urn:li:person:${connection.linkedin_member_id}`;

  if (!authorUrn) {
    throw new Error(
      'LinkedIn page posting requires a selected organization. Choose a page in Create Post.'
    );
  }

  const mediaUrl = getMediaUrl(content);
  const mediaType = String(content?.media_type || '').toLowerCase();
  let mediaPayload = null;

  if (mediaUrl) {
    if (mediaType === 'video') {
      throw new Error('LinkedIn video publishing is not configured yet. Please use image or text-only LinkedIn posts.');
    }

    const { contentType, buffer } = await getContentTypeFromUrl(mediaUrl);
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error('LinkedIn media upload currently supports image posts only');
    }

    const { uploadUrl, assetUrn } = await registerLinkedInImageUpload({
      accessToken: connection.linkedin_access_token,
      ownerUrn: authorUrn,
    });
    await uploadLinkedInImageBinary({
      uploadUrl,
      accessToken: connection.linkedin_access_token,
      contentType,
      buffer,
    });

    mediaPayload = {
      status: 'READY',
      media: assetUrn,
      title: {
        text: content.title || 'Image',
      },
      description: {
        text: content.description || text,
      },
    };
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.linkedin_access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: mediaPayload ? 'IMAGE' : 'NONE',
          ...(mediaPayload ? { media: [mediaPayload] } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const rawBody = await response.text();
  let parsedBody = {};
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch (_) {
    parsedBody = { rawBody };
  }

  if (!response.ok) {
    const message =
      parsedBody?.message ||
      parsedBody?.serviceErrorCode ||
      parsedBody?.error_description ||
      rawBody ||
      'LinkedIn publish failed';
    throw new Error(`LinkedIn publish failed: ${message}`);
  }

  const providerPostId =
    response.headers.get('x-restli-id') ||
    parsedBody?.id ||
    parsedBody?.urn ||
    null;

  return {
    providerPostId,
    memberId: connection.linkedin_member_id,
    memberName: connection.linkedin_member_name || null,
    authorType,
    authorUrn,
    raw: parsedBody,
  };
};

module.exports = {
  publishLinkedInPost,
};
