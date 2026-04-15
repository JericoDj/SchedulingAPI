const { instagramAppId, instagramAppSecret, instagramRedirectUri, instagramScopes } = require('../../config/env');
const {
  graphApiVersion,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
} = require('./shared');

const getEffectiveInstagramRedirectUri = createRedirectUriResolver(
  instagramRedirectUri,
  '/api/oauth/instagram/callback'
);

const instagramAuth = (req, res) => {
  if (!instagramAppId) {
    return res.status(500).json({ message: 'INSTAGRAM_APP_ID is not configured' });
  }

  const redirectUri = getEffectiveInstagramRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect ? toState({ redirect: callbackRedirect }) : undefined;

  const params = new URLSearchParams({
    client_id: instagramAppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: instagramScopes,
  });

  if (state) {
    params.set('state', state);
  }

  const authUrl = `https://www.facebook.com/${graphApiVersion}/dialog/oauth?${params.toString()}`;
  return res.redirect(authUrl);
};

const instagramCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'instagram',
      appSecret: instagramAppSecret,
      appSecretEnvKey: 'INSTAGRAM_APP_SECRET',
      appId: instagramAppId,
      getRedirectUri: getEffectiveInstagramRedirectUri,
    });
  } catch (err) {
    console.error('Instagram OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  instagramAuth,
  instagramCallback,
};

