const bcrypt = require('bcryptjs');

const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, avatar_url } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const existingUser = await userModel.findByEmail(email);

  if (existingUser) {
    res.status(409);
    throw new Error('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    name,
    email,
    passwordHash,
    avatar_url,
  });

  res.status(201).json({
    message: 'User registered successfully',
    token: generateToken(user.id),
    user,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await userModel.findByEmailWithPassword(email);

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  delete user.password_hash;

  res.status(200).json({
    message: 'Login successful',
    token: generateToken(user.id),
    user,
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});

module.exports = {
  register,
  login,
  getCurrentUser,
};
