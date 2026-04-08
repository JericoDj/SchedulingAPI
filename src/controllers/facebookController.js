const createPostController = require('./createPostController');
const facebookPostModel = require('../models/facebookPostModel');

module.exports = createPostController(facebookPostModel, 'Facebook');
