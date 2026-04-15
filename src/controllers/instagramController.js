const createPostController = require('./createPostController');
const instagramPostModel = require('../models/instagramPostModel');
const { instagramAuth, instagramCallback } = require('./oauth/instagramOAuthController');

module.exports = {
  ...createPostController(instagramPostModel, 'Instagram'),
  instagramAuth,
  instagramCallback,
};
