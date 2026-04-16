const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const pinterestController = require('../controllers/pinterestController');

const router = express.Router();

router.get('/', protect, pinterestController.getPosts);
router.post('/', protect, pinterestController.createPost);
router.get('/scheduled', protect, pinterestController.getScheduledPosts);
router.post('/:id/schedule', protect, pinterestController.schedulePost);
router.post('/:id/publish', protect, pinterestController.publishPost);
router.get('/:id', protect, pinterestController.getPostById);
router.put('/:id', protect, pinterestController.updatePost);
router.delete('/:id', protect, pinterestController.deletePost);

module.exports = router;
