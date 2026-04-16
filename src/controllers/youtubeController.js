const createPostController = require('./createPostController');
const youtubePostModel = require('../models/youtubePostModel');
const { youtubeAuth, youtubeCallback } = require('./oauth/youtubeOAuthController');

module.exports = {
  ...createPostController(youtubePostModel, 'YouTube'),
  youtubeAuth,
  youtubeCallback,
};
