const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const threadsController = require('../controllers/threadsController');

const router = express.Router();

router.get('/', protect, threadsController.getPosts);
router.post('/', protect, threadsController.createPost);
router.get('/scheduled', protect, threadsController.getScheduledPosts);
router.post('/:id/schedule', protect, threadsController.schedulePost);
router.post('/:id/publish', protect, threadsController.publishPost);
router.get('/:id', protect, threadsController.getPostById);
router.put('/:id', protect, threadsController.updatePost);
router.delete('/:id', protect, threadsController.deletePost);

module.exports = router;
