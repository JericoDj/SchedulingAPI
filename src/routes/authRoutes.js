const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { getCurrentUser, login, register } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);

module.exports = router;
