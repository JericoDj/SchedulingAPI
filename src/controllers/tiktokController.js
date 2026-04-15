const createPostController = require('./createPostController');
const tiktokPostModel = require('../models/tiktokPostModel');
const { tiktokAuth, tiktokCallback } = require('./oauth/tiktokOAuthController');

module.exports = {
  ...createPostController(tiktokPostModel, 'TikTok'),
  tiktokAuth,
  tiktokCallback,
};
