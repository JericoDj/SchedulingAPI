const createPostController = require('./createPostController');
const linkedinPostModel = require('../models/linkedinPostModel');
const { linkedinAuth, linkedinCallback } = require('./oauth/linkedinOAuthController');

module.exports = {
  ...createPostController(linkedinPostModel, 'LinkedIn'),
  linkedinAuth,
  linkedinCallback,
};
