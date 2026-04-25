const bcrypt = require('bcryptjs');

const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const { graphApiVersion, linkedinVersion } = require('../config/env');

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

const connectInstagram = asyncHandler(async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  // 1. Get Facebook Pages
  const pagesUrl = `https://graph.facebook.com/${graphApiVersion}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(access_token)}`;
  const pagesResp = await fetch(pagesUrl);
  const pagesData = await pagesResp.json();

  if (!pagesResp.ok) {
    res.status(pagesResp.status || 400);
    throw new Error(pagesData?.error?.message || 'Failed to fetch Facebook Pages');
  }

  const pages = pagesData.data || [];
  let igAccount = null;
  let pageWithIg = null;

  // 2. Iterate pages and fetch instagram_business_account using the Page Access Token
  for (const page of pages) {
    if (!page.access_token) continue;
    
    try {
      const igUrl = `https://graph.facebook.com/${graphApiVersion}/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`;
      const igResp = await fetch(igUrl);
      const igData = await igResp.json();
      
      if (igResp.ok && igData.instagram_business_account) {
        igAccount = igData.instagram_business_account;
        pageWithIg = page;
        break; // Found one, exit loop
      }
    } catch (err) {
      console.warn(`Failed to fetch IG account for page ${page.id}:`, err);
    }
  }

  if (!pageWithIg || !igAccount) {
    res.status(400);
    throw new Error('No valid Instagram Business Account found linked to your Facebook Pages. Ensure you have a professional account linked to a Page with proper permissions.');
  }

  // 3. Save the connection using the PAGE ACCESS TOKEN
  const updatedUser = await userModel.saveInstagramConnection(req.user.id, {
    accessToken: pageWithIg.access_token, // Must use Page Access Token for IG publishing
    businessAccountId: igAccount.id,
    username: igAccount.username,
    instagramUserId: pageWithIg.id, // Storing Linked Facebook Page ID as reference
  });

  res.status(200).json({
    message: 'Instagram connection saved',
    selected_account: {
      id: igAccount.id,
      username: igAccount.username,
      page_id: pageWithIg.id,
    },
    user: updatedUser,
  });
});

const connectTikTok = asyncHandler(async (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  // Get TikTok user info
  const infoUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username';
  const infoResp = await fetch(infoUrl, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const infoData = await infoResp.json();

  if (!infoResp.ok) {
    res.status(infoResp.status || 400);
    throw new Error(infoData?.error?.message || 'Failed to fetch TikTok user info');
  }

  const user = infoData.data?.user;
  if (!user?.open_id) {
    throw new Error('TikTok open_id not found in response');
  }

  const updatedUser = await userModel.saveTikTokConnection(req.user.id, {
    accessToken: access_token,
    refreshToken: refresh_token || null,
    openId: user.open_id,
    username: user.username || user.display_name || null,
  });

  res.status(200).json({
    message: 'TikTok connection saved',
    user: updatedUser,
  });
});

const connectThreads = asyncHandler(async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  // Get Threads user info
  const infoUrl = `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(access_token)}`;
  const infoResp = await fetch(infoUrl);
  const infoData = await infoResp.json();

  if (!infoResp.ok) {
    res.status(infoResp.status || 400);
    throw new Error(infoData?.error?.message || 'Failed to fetch Threads user info');
  }

  if (!infoData.id) {
    throw new Error('Threads user ID not found');
  }

  const updatedUser = await userModel.saveThreadsConnection(req.user.id, {
    accessToken: access_token,
    threadsUserId: infoData.id,
    username: infoData.username || null,
  });

  res.status(200).json({
    message: 'Threads connection saved',
    user: updatedUser,
  });
});

const connectLinkedIn = asyncHandler(async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  let memberId = null;
  let memberName = null;

  const userInfoResp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const userInfoData = await userInfoResp.json().catch(() => ({}));

  if (userInfoResp.ok) {
    memberId = userInfoData?.sub || null;
    memberName =
      [userInfoData?.given_name, userInfoData?.family_name].filter(Boolean).join(' ').trim() ||
      userInfoData?.name ||
      null;
  } else {
    const meResp = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const meData = await meResp.json().catch(() => ({}));

    if (!meResp.ok) {
      res.status(meResp.status || userInfoResp.status || 400);
      throw new Error(
        meData?.message ||
          userInfoData?.message ||
          'Failed to fetch LinkedIn member profile'
      );
    }

    memberId = meData?.id || null;
  }

  if (!memberId) {
    res.status(400);
    throw new Error('LinkedIn member ID not found from access token');
  }

  const updatedUser = await userModel.saveLinkedInConnection(req.user.id, {
    accessToken: access_token,
    memberId,
    memberName,
  });

  res.status(200).json({
    message: 'LinkedIn connection saved',
    member: {
      id: memberId,
      name: memberName,
    },
    user: updatedUser,
  });
});

const fetchLinkedInAdminPages = async (accessToken) => {
  const commonHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': linkedinVersion,
  };

  let aclsResp = await fetch(
    'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=100&start=0',
    {
      headers: commonHeaders,
    }
  );
  let aclsData = await aclsResp.json().catch(() => ({}));

  if (!aclsResp.ok) {
    // Backward-compatible fallback for older apps.
    const fallbackResp = await fetch(
      'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );
    const fallbackData = await fallbackResp.json().catch(() => ({}));

    if (!fallbackResp.ok) {
      const warningMessage =
        aclsData?.message ||
        fallbackData?.message ||
        fallbackData?.serviceErrorCode ||
        'Unable to fetch LinkedIn admin pages. Confirm r_organization_admin scope and app access.';
      return {
        pages: [],
        warnings: [warningMessage],
      };
    }

    aclsResp = fallbackResp;
    aclsData = fallbackData;
  }

  const rawElements = Array.isArray(aclsData?.elements) ? aclsData.elements : [];
  const organizationIds = rawElements
    .map((element) => {
      const target =
        element?.organizationTarget ||
        element?.organizationalTarget ||
        element?.organization ||
        '';
      const match = String(target).match(/urn:li:organization:(\d+)/);
      return match?.[1] || null;
    })
    .filter(Boolean);

  const uniqueIds = [...new Set(organizationIds)];
  const pages = uniqueIds.map((id) => ({
    id,
    urn: `urn:li:organization:${id}`,
    name: `Organization ${id}`,
  }));

  if (pages.length === 0) {
    return { pages, warnings: [] };
  }

  const lookupPromises = pages.map(async (page) => {
    try {
      const restOrgResp = await fetch(`https://api.linkedin.com/rest/organizations/${page.id}`, {
        headers: commonHeaders,
      });
      const restOrgData = await restOrgResp.json().catch(() => ({}));
      if (restOrgResp.ok) {
        return {
          ...page,
          name: restOrgData?.localizedName || page.name,
        };
      }
      const legacyOrgResp = await fetch(`https://api.linkedin.com/v2/organizations/${page.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      const legacyOrgData = await legacyOrgResp.json().catch(() => ({}));
      if (legacyOrgResp.ok) {
        return {
          ...page,
          name: legacyOrgData?.localizedName || page.name,
        };
      }
      return page;
    } catch (_) {
      return page;
    }
  });

  const resolved = await Promise.all(lookupPromises);
  return { pages: resolved, warnings: [] };
};

const getLinkedInPages = asyncHandler(async (req, res) => {
  const connection = await userModel.getLinkedInConnection(req.user.id);
  if (!connection?.linkedin_access_token) {
    res.status(400);
    throw new Error('LinkedIn account is not connected');
  }

  const { pages, warnings } = await fetchLinkedInAdminPages(connection.linkedin_access_token);

  res.status(200).json({
    pages,
    defaultTarget: {
      authorType: connection.linkedin_default_author_type || 'personal',
      organizationId: connection.linkedin_organization_id || null,
      organizationName: connection.linkedin_organization_name || null,
    },
    warnings,
  });
});

const setLinkedInTarget = asyncHandler(async (req, res) => {
  const authorType = String(req.body.author_type || '').trim().toLowerCase();
  if (!['personal', 'page'].includes(authorType)) {
    res.status(400);
    throw new Error("author_type must be either 'personal' or 'page'");
  }

  let organizationId = null;
  let organizationName = null;

  if (authorType === 'page') {
    organizationId = String(req.body.organization_id || '').trim();
    organizationName = String(req.body.organization_name || '').trim() || null;

    if (!organizationId) {
      res.status(400);
      throw new Error('organization_id is required when author_type is page');
    }
  }

  const updatedUser = await userModel.saveLinkedInPublishingTarget(req.user.id, {
    authorType,
    organizationId,
    organizationName,
  });

  if (!updatedUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    message: 'LinkedIn posting target saved',
    target: {
      authorType,
      organizationId,
      organizationName,
    },
    user: updatedUser,
  });
});

const connectX = asyncHandler(async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  const meResp = await fetch('https://api.twitter.com/2/users/me?user.fields=username', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const meData = await meResp.json();

  if (!meResp.ok) {
    res.status(meResp.status || 400);
    throw new Error(
      meData?.detail || meData?.title || meData?.error || 'Failed to fetch X user profile'
    );
  }

  const xUserId = meData?.data?.id;
  const username = meData?.data?.username || null;

  if (!xUserId) {
    res.status(400);
    throw new Error('X user ID not found from access token');
  }

  const updatedUser = await userModel.saveXConnection(req.user.id, {
    accessToken: access_token,
    xUserId,
    username,
  });

  res.status(200).json({
    message: 'X connection saved',
    x_user: {
      id: xUserId,
      username,
    },
    user: updatedUser,
  });
});

const connectYouTube = asyncHandler(async (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token) {
    res.status(400);
    throw new Error('access_token is required');
  }

  const channelResp = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const channelData = await channelResp.json();

  if (!channelResp.ok) {
    res.status(channelResp.status || 400);
    throw new Error(
      channelData?.error?.message || 'Failed to fetch YouTube channel profile'
    );
  }

  const channel = channelData.items && channelData.items[0];
  if (!channel) {
    res.status(404);
    throw new Error('No YouTube channel found for this account. Please create a channel first.');
  }

  const updatedUser = await userModel.saveYouTubeConnection(req.user.id, {
    accessToken: access_token,
    refreshToken: refresh_token || null,
    channelId: channel.id,
    username: channel.snippet?.title || null,
  });

  res.status(200).json({
    message: 'YouTube connection saved',
    channel: {
      id: channel.id,
      title: channel.snippet?.title,
    },
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
  connectInstagram,
  connectTikTok,
  connectThreads,
  connectX,
  connectLinkedIn,
  connectYouTube,
  getLinkedInPages,
  setLinkedInTarget,
};
