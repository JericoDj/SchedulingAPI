const createPostRoutes = require('./createPostRoutes');
const linkedinController = require('../controllers/linkedinController');

module.exports = createPostRoutes(linkedinController);
