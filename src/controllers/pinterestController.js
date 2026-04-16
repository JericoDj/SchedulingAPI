const createPostController = require('./createPostController');
const pinterestPostModel = require('../models/pinterestPostModel');
const { pinterestAuth, pinterestCallback } = require('./oauth/pinterestOAuthController');

module.exports = {
  ...createPostController(pinterestPostModel, 'Pinterest'),
  pinterestAuth,
  pinterestCallback,
};
