const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { getScheduledPosts, schedulePost, updateScheduledPost, deleteScheduledPost } = require('../controllers/scheduleController');

const router = express.Router();

router.get('/', protect, getScheduledPosts);
router.post('/', protect, schedulePost);
router.put('/:id', protect, updateScheduledPost);
router.delete('/:id', protect, deleteScheduledPost);

module.exports = router;
