const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const facebookController = require('../controllers/facebookController');
const { publishNow } = require('../services/facebookPublisher');

const router = express.Router();

// Instant publish — skips scheduling, posts directly to Facebook Graph API
router.post('/publish-now', protect, publishNow);

router.get('/', protect, facebookController.getPosts);
router.post('/', protect, facebookController.createPost);
router.get('/scheduled', protect, facebookController.getScheduledPosts);
router.post('/:id/schedule', protect, facebookController.schedulePost);
router.post('/:id/publish', protect, facebookController.publishPost);
router.get('/:id', protect, facebookController.getPostById);
router.put('/:id', protect, facebookController.updatePost);
router.delete('/:id', protect, facebookController.deletePost);

module.exports = router;
