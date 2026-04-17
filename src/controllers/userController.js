const bcrypt = require('bcryptjs');

const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { graphApiVersion } = require('../config/env');

const canManageUser = (requestUser, targetUserId) => {
  return requestUser.role === 'admin' || requestUser.id === targetUserId;
};

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, avatar_url } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required');
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
    role: 'user',
  });

  res.status(201).json(user);
});

const getUsers = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const users = await userModel.findAll();
    res.status(200).json(users);
    return;
  }

  res.status(200).json([req.user]);
});

const getUserById = asyncHandler(async (req, res) => {
  if (!canManageUser(req.user, req.params.id)) {
    res.status(403);
    throw new Error('You do not have permission to view this user');
  }

  const user = await userModel.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  if (!canManageUser(req.user, req.params.id)) {
    res.status(403);
    throw new Error('You do not have permission to update this user');
  }

  if (req.body.email) {
    const existingUser = await userModel.findByEmail(req.body.email);

    if (existingUser && existingUser.id !== req.params.id) {
      res.status(409);
      throw new Error('Email is already registered');
    }
  }

  const updates = {
    name: req.body.name,
    email: req.body.email,
    avatar_url: req.body.avatar_url,
  };

  if (req.user.role === 'admin' && req.body.role) {
    updates.role = req.body.role;
  }

  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    updates.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  const updatedUser = await userModel.update(req.params.id, updates);

  if (!updatedUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(updatedUser);
});

const deleteUser = asyncHandler(async (req, res) => {
  if (!canManageUser(req.user, req.params.id)) {
    res.status(403);
    throw new Error('You do not have permission to delete this user');
  }

  const deletedUser = await userModel.delete(req.params.id);

  if (!deletedUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    message: 'User deleted successfully',
    user: deletedUser,
  });
});

const connectFacebookPage = asyncHandler(async (req, res) => {
  const accessToken = String(req.body.access_token || '').trim();
  const requestedPageId = String(req.body.page_id || '').trim() || null;

  if (!accessToken) {
    res.status(400);
    throw new Error('access_token is required');
  }

  const accountsUrl = `https://graph.facebook.com/${graphApiVersion}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(
    accessToken
  )}`;
  const accountsResponse = await fetch(accountsUrl);
  const accountsData = await accountsResponse.json();

  if (!accountsResponse.ok) {
    res.status(accountsResponse.status || 400);
    throw new Error(
      accountsData?.error?.message || 'Failed to fetch Facebook pages for this account'
    );
  }

  const pages = Array.isArray(accountsData?.data) ? accountsData.data : [];

  if (pages.length === 0) {
    res.status(400);
    throw new Error('No Facebook pages found for this account');
  }

  const selectedPage =
    pages.find((page) => String(page.id) === requestedPageId) || pages[0];

  if (!selectedPage?.id || !selectedPage?.access_token) {
    res.status(400);
    throw new Error('Selected Facebook page does not include required publish permissions');
  }

  const updatedUser = await userModel.saveFacebookConnection(req.user.id, {
    userAccessToken: accessToken,
    pageId: String(selectedPage.id),
    pageName: selectedPage.name || null,
    pageAccessToken: selectedPage.access_token,
  });

  if (!updatedUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    message: 'Facebook page connected for scheduler worker',
    selected_page: {
      id: String(selectedPage.id),
      name: selectedPage.name || null,
    },
    pages: pages.map((page) => ({
      id: String(page.id),
      name: page.name || null,
    })),
    user: updatedUser,
  });
});

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  connectFacebookPage,
};
