const createPostRoutes = require('./createPostRoutes');
const facebookController = require('../controllers/facebookController');

module.exports = createPostRoutes(facebookController);
