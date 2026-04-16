const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const linkedinController = require('../controllers/linkedinController');

const router = express.Router();

router.get('/', protect, linkedinController.getPosts);
router.post('/', protect, linkedinController.createPost);
router.get('/scheduled', protect, linkedinController.getScheduledPosts);
router.post('/:id/schedule', protect, linkedinController.schedulePost);
router.post('/:id/publish', protect, linkedinController.publishPost);
router.get('/:id', protect, linkedinController.getPostById);
router.put('/:id', protect, linkedinController.updatePost);
router.delete('/:id', protect, linkedinController.deletePost);

module.exports = router;
