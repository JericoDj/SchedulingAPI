const createPostRoutes = require('./createPostRoutes');
const tiktokController = require('../controllers/tiktokController');

module.exports = createPostRoutes(tiktokController);
