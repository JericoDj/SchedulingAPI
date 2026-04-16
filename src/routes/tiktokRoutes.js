const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const tiktokController = require('../controllers/tiktokController');

const router = express.Router();

router.get('/', protect, tiktokController.getPosts);
router.post('/', protect, tiktokController.createPost);
router.get('/scheduled', protect, tiktokController.getScheduledPosts);
router.post('/:id/schedule', protect, tiktokController.schedulePost);
router.post('/:id/publish', protect, tiktokController.publishPost);
router.get('/:id', protect, tiktokController.getPostById);
router.put('/:id', protect, tiktokController.updatePost);
router.delete('/:id', protect, tiktokController.deletePost);

module.exports = router;
