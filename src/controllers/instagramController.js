const createPostController = require('./createPostController');
const instagramPostModel = require('../models/instagramPostModel');

module.exports = createPostController(instagramPostModel, 'Instagram');
