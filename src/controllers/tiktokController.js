const createPostController = require('./createPostController');
const tiktokPostModel = require('../models/tiktokPostModel');

module.exports = createPostController(tiktokPostModel, 'TikTok');
