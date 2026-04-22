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
    details: [],
  };

  for (const post of claimedPosts) {
    try {
      console.log(
        `[scheduler] processing post=${post.id} platform=${post.platform} scheduled_at=${post.scheduled_at}`
      );

      const publishResult = await publishScheduledPost(post);
      await scheduledPostModel.markPosted(post.id, publishResult?.providerPostId || null);
      result.posted += 1;
      result.details.push({
        id: post.id,
        platform: post.platform,
        status: 'posted',
        publishResult,
        content: post.content,
      });

      console.log(`[scheduler] posted post=${post.id} result=${JSON.stringify(publishResult)}`);
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      await scheduledPostModel.markFailed(post.id, errorMessage);
      result.failed += 1;
      result.details.push({
        id: post.id,
        platform: post.platform,
        status: 'failed',
        error: errorMessage,
        content: post.content,
      });

      console.error(`[scheduler] failed post=${post.id} error=${errorMessage}`);
    }
  }

  return result;
};

module.exports = {
  runSchedulerBatch,
};
