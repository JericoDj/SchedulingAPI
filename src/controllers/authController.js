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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await userModel.findByEmail(email);

  // Do not expose whether the email exists.
  if (user) {
    console.log(`[auth] forgot password requested for user=${user.id}`);
  } else {
    console.log('[auth] forgot password requested for unknown email');
  }

  res.status(200).json({
    message: 'If an account exists for this email, password reset instructions have been sent.',
  });
});

const verifyFacebookLogin = asyncHandler(async (req, res) => {
  const { accessToken, userID } = req.body;

  if (!accessToken || !userID) {
    res.status(400);
    throw new Error('Access token and userID are required');
  }

  // Verify the token by fetching user profile from Facebook
  const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`);
  
  if (!response.ok) {
    res.status(401);
    throw new Error('Invalid Facebook token');
  }

  const fbUser = await response.json();

  if (fbUser.id !== userID) {
    res.status(401);
    throw new Error('Facebook User ID mismatch');
  }

  // Check if user exists by email, if not create a new user
  const email = fbUser.email || `${fbUser.id}@facebook.com`;
  let user = await userModel.findByEmail(email);

  if (!user) {
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
    user = await userModel.create({
      name: fbUser.name,
      email: email,
      passwordHash: randomPassword,
      avatar_url: fbUser.picture?.data?.url || null,
    });
  } else {
    // If user model needs password_hash removed before sending
    delete user.password_hash;
  }

  res.status(200).json({
    message: 'Facebook login successful',
    token: generateToken(user.id),
    user,
  });
});

module.exports = {
  register,
  login,
  verifyFacebookLogin,
  getCurrentUser,
  forgotPassword,
};
