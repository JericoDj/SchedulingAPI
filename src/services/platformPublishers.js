const normalizePlatform = (platform) => String(platform || '').trim().toLowerCase();

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

const publishers = {
  facebook: publishUsingExistingFlow,
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
