const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { getScheduledPosts, schedulePost, updateScheduledPost, deleteScheduledPost } = require('../controllers/scheduleController');
const { publishNow } = require('../controllers/publishNowController');

const router = express.Router();

router.get('/', protect, getScheduledPosts);
router.post('/', protect, schedulePost);
router.post('/publish-now', protect, publishNow);
router.put('/:id', protect, updateScheduledPost);
router.delete('/:id', protect, deleteScheduledPost);

module.exports = router;
