const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const {
  createUser,
  connectFacebookPage,
  connectInstagram,
  connectLinkedIn,
  connectTikTok,
  connectThreads,
  connectX,
  deleteUser,
  getLinkedInPages,
  getUserById,
  getUsers,
  setLinkedInTarget,
  updateUser,
  connectYouTube,
} = require('../controllers/userController');


const router = express.Router();

router.get('/', protect, getUsers);
router.post('/me/facebook-connection', protect, connectFacebookPage);
router.post('/me/instagram-connection', protect, connectInstagram);
router.post('/me/linkedin-connection', protect, connectLinkedIn);
router.get('/me/linkedin-pages', protect, getLinkedInPages);
router.post('/me/linkedin-target', protect, setLinkedInTarget);
router.post('/me/tiktok-connection', protect, connectTikTok);
router.post('/me/threads-connection', protect, connectThreads);
router.post('/me/x-connection', protect, connectX);
router.post('/me/youtube-connection', protect, connectYouTube);
router.post('/', createUser);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;
