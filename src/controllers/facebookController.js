const createPostController = require('./createPostController');
const facebookPostModel = require('../models/facebookPostModel');
const { facebookAuth, facebookCallback } = require('./oauth/facebookOAuthController');

module.exports = {
  ...createPostController(facebookPostModel, 'Facebook'),
  facebookAuth,
  facebookCallback,
};
