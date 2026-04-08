const createPostRoutes = require('./createPostRoutes');
const instagramController = require('../controllers/instagramController');

module.exports = createPostRoutes(instagramController);
