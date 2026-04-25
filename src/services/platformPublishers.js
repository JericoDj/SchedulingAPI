const normalizePlatform = (platform) => String(platform || '').trim().toLowerCase();
const { publishFacebookPost } = require('./facebookPublisher');
const { publishInstagramPost } = require('./instagramPublisher');
const { publishTikTokPost } = require('./tiktokPublisher');
const { publishThreadsPost } = require('./threadsPublisher');
const { publishXPost } = require('./xPublisher');
const { publishLinkedInPost } = require('./linkedinPublisher');
const { publishYouTubePost } = require('./youtubePublisher');

const publishUsingExistingFlow = async (post) => {
  if (!post.content || typeof post.content !== 'object' || Array.isArray(post.content)) {
    throw new Error('content must be a JSON object');
  }
  return {
    providerPostId: null,
    note: 'Publish integration placeholder - external API publish can be plugged in here.',
  };
};

const publishers = {
  facebook: publishFacebookPost,
  instagram: publishInstagramPost,
  tiktok: publishTikTokPost,
  linkedin: publishLinkedInPost,
  threads: publishThreadsPost,
  x: publishXPost,
  youtube: publishYouTubePost,
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
