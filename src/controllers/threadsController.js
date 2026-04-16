const createPostController = require('./createPostController');
const threadsPostModel = require('../models/threadsPostModel');
const {
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
} = require('./oauth/threadsOAuthController');

module.exports = {
  ...createPostController(threadsPostModel, 'Threads'),
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
};
