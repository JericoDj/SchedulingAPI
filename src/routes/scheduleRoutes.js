const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { getScheduledPosts, schedulePost } = require('../controllers/scheduleController');

const router = express.Router();

router.get('/', protect, getScheduledPosts);
router.post('/', protect, schedulePost);

module.exports = router;
