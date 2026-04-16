const createPostController = require('./createPostController');
const xPostModel = require('../models/xPostModel');
const { xAuth, xCallback } = require('./oauth/xOAuthController');

module.exports = {
  ...createPostController(xPostModel, 'X'),
  xAuth,
  xCallback,
};
