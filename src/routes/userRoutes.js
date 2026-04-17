const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const {
  getCurrentUser,
  forgotPassword,
  login,
  register,
  verifyFacebookLogin,
} = require('../controllers/authController');
const {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} = require('../controllers/userController');

const userRouter = express.Router();
const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/facebook/verify', verifyFacebookLogin);
authRouter.get('/me', protect, getCurrentUser);

userRouter.get('/', protect, getUsers);
userRouter.post('/', createUser);
userRouter.get('/:id', protect, getUserById);
userRouter.put('/:id', protect, updateUser);
userRouter.delete('/:id', protect, deleteUser);

module.exports = {
  userRouter,
  authRouter,
};
