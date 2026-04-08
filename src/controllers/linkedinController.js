const createPostController = require('./createPostController');
const linkedinPostModel = require('../models/linkedinPostModel');

module.exports = createPostController(linkedinPostModel, 'LinkedIn');
