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

router.get('/', protect, getUsers);
router.post('/', createUser);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;
