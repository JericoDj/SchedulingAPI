const express = require('express');

const { protect } = require('../middleware/authMiddleware');

const personalRoutes = (controller) => {
  const router = express.Router();

  router.route('/').get(protect, controller.getPosts).post(protect, controller.createPost);
  router.route('/scheduled').get(protect, controller.getScheduledPosts);
  router.route('/:id/schedule').post(protect, controller.schedulePost);
  router.route('/:id/publish').post(protect, controller.publishPost);
  router
    .route('/:id')
    .get(protect, controller.getPostById)
    .put(protect, controller.updatePost)
    .delete(protect, controller.deletePost);

  return router;
};

module.exports = personalRoutes;
