const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const xController = require('../controllers/xController');

const router = express.Router();

router.get('/', protect, xController.getPosts);
router.post('/', protect, xController.createPost);
router.get('/scheduled', protect, xController.getScheduledPosts);
router.post('/:id/schedule', protect, xController.schedulePost);
router.post('/:id/publish', protect, xController.publishPost);
router.get('/:id', protect, xController.getPostById);
router.put('/:id', protect, xController.updatePost);
router.delete('/:id', protect, xController.deletePost);

module.exports = router;
