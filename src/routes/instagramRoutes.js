const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const instagramController = require('../controllers/instagramController');

const router = express.Router();

router.get('/messages', protect, instagramController.getMessages);
router.get('/', protect, instagramController.getPosts);
router.post('/', protect, instagramController.createPost);
router.get('/scheduled', protect, instagramController.getScheduledPosts);
router.post('/:id/schedule', protect, instagramController.schedulePost);
router.post('/:id/publish', protect, instagramController.publishPost);

// Graph API direct actions (pass providerPostId)
router.get('/provider/:providerPostId/comments', protect, instagramController.getComments);
router.get('/provider/:providerPostId/likes', protect, instagramController.getLikes);
router.put('/provider/:providerPostId', protect, instagramController.editPost);
router.delete('/provider/:providerPostId', protect, instagramController.deleteGraphPost);

router.get('/:id', protect, instagramController.getPostById);
router.put('/:id', protect, instagramController.updatePost);
router.delete('/:id', protect, instagramController.deletePost);

module.exports = router;
