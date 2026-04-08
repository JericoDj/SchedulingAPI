const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} = require('../controllers/userController');

const router = express.Router();

router.route('/').get(protect, getUsers).post(createUser);
router.route('/:id').get(protect, getUserById).put(protect, updateUser).delete(protect, deleteUser);

module.exports = router;
