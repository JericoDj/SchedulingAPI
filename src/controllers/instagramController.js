const createPostController = require('./createPostController');
const instagramPostModel = require('../models/instagramPostModel');
const { instagramAuth, instagramCallback } = require('./oauth/instagramOAuthController');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { graphApiVersion } = require('../config/env');

// Helper to get connection
const getConnection = async (userId) => {
  const connection = await userModel.getInstagramConnection(userId);
  if (!connection?.instagram_access_token) {
    throw new Error('Instagram account not connected');
  }
  return connection;
};

const getComments = asyncHandler(async (req, res) => {
  const { providerPostId } = req.params;
  const connection = await getConnection(req.user.id);
  
  const url = `https://graph.facebook.com/${graphApiVersion}/${providerPostId}/comments?access_token=${connection.instagram_access_token}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

const getLikes = asyncHandler(async (req, res) => {
  const { providerPostId } = req.params;
  const connection = await getConnection(req.user.id);
  
  const url = `https://graph.facebook.com/${graphApiVersion}/${providerPostId}/likes?access_token=${connection.instagram_access_token}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

const editPost = asyncHandler(async (req, res) => {
  const { providerPostId } = req.params;
  const { text } = req.body;
  const connection = await getConnection(req.user.id);
  
  const url = `https://graph.facebook.com/${graphApiVersion}/${providerPostId}`;
  const params = new URLSearchParams({
    access_token: connection.instagram_access_token,
    caption: text,
  });
  
  const response = await fetch(url, { method: 'POST', body: params });
  const data = await response.json();
  res.json(data);
});

const deleteGraphPost = asyncHandler(async (req, res) => {
  const { providerPostId } = req.params;
  const connection = await getConnection(req.user.id);
  
  const url = `https://graph.facebook.com/${graphApiVersion}/${providerPostId}?access_token=${connection.instagram_access_token}`;
  const response = await fetch(url, { method: 'DELETE' });
  const data = await response.json();
  res.json(data);
});

const getMessages = asyncHandler(async (req, res) => {
  const connection = await getConnection(req.user.id);
  const igUserId = connection.instagram_business_account_id;
  
  const url = `https://graph.facebook.com/${graphApiVersion}/${connection.instagram_user_id || igUserId}/conversations?platform=instagram&access_token=${connection.instagram_access_token}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

module.exports = {
  ...createPostController(instagramPostModel, 'Instagram'),
  instagramAuth,
  instagramCallback,
  getComments,
  getLikes,
  editPost,
  deleteGraphPost,
  getMessages,
};
