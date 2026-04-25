const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const youtubeController = require('../controllers/youtubeController');
const { publishNow } = require('../services/youtubePublisher');

const router = express.Router();

// Instant publish — skips scheduling, posts directly to YouTube API
router.post('/publish-now', protect, publishNow);

router.get('/', protect, youtubeController.getPosts);
router.post('/', protect, youtubeController.createPost);
router.get('/scheduled', protect, youtubeController.getScheduledPosts);
router.post('/:id/schedule', protect, youtubeController.schedulePost);
router.post('/:id/publish', protect, youtubeController.publishPost);
router.get('/:id', protect, youtubeController.getPostById);
router.put('/:id', protect, youtubeController.updatePost);
router.delete('/:id', protect, youtubeController.deletePost);

module.exports = router;
