const scheduledPostModel = require('../models/scheduledPostModel');
const { publishScheduledPost } = require('./platformPublishers');

const DEFAULT_BATCH_SIZE = 10;

const toErrorMessage = (error) => {
  if (!error) {
    return 'Unknown scheduler error';
  }

  return String(error.message || error).slice(0, 1000);
};

const runSchedulerBatch = async ({ batchSize = DEFAULT_BATCH_SIZE } = {}) => {
  const claimedPosts = await scheduledPostModel.claimDuePending(batchSize);

  const result = {
    fetched: claimedPosts.length,
    posted: 0,
    failed: 0,
  };

  for (const post of claimedPosts) {
    try {
      console.log(
        `[scheduler] processing post=${post.id} platform=${post.platform} scheduled_at=${post.scheduled_at}`
      );

      await publishScheduledPost(post);
      await scheduledPostModel.markPosted(post.id);
      result.posted += 1;

      console.log(`[scheduler] posted post=${post.id}`);
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      await scheduledPostModel.markFailed(post.id, errorMessage);
      result.failed += 1;

      console.error(`[scheduler] failed post=${post.id} error=${errorMessage}`);
    }
  }

  return result;
};

module.exports = {
  runSchedulerBatch,
};
