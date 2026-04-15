const { facebookAppId, facebookAppSecret, facebookRedirectUri, facebookScopes } = require('../../config/env');
const {
  graphApiVersion,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
} = require('./shared');

const getEffectiveFacebookRedirectUri = createRedirectUriResolver(
  facebookRedirectUri,
  '/api/oauth/facebook/callback'
);

const facebookAuth = (req, res) => {
  if (!facebookAppId) {
    return res.status(500).json({ message: 'FACEBOOK_APP_ID is not configured' });
  }

  const redirectUri = getEffectiveFacebookRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect ? toState({ redirect: callbackRedirect }) : undefined;

  const params = new URLSearchParams({
    client_id: facebookAppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: facebookScopes,
  });

  if (state) {
    params.set('state', state);
  }

  const authUrl = `https://www.facebook.com/${graphApiVersion}/dialog/oauth?${params.toString()}`;
  return res.redirect(authUrl);
};

const facebookCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'facebook',
      appSecret: facebookAppSecret,
      appSecretEnvKey: 'FACEBOOK_APP_SECRET',
      appId: facebookAppId,
      getRedirectUri: getEffectiveFacebookRedirectUri,
    });
  } catch (err) {
    console.error('Facebook OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  facebookAuth,
  facebookCallback,
};

