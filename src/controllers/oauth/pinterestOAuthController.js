const { pinterestClientId, pinterestClientSecret, pinterestRedirectUri, pinterestScopes } = require('../../config/env');
const {
  crypto,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
  exchangePinterestCodeForToken,
} = require('./shared');

const getEffectivePinterestRedirectUri = createRedirectUriResolver(
  pinterestRedirectUri,
  '/api/oauth/pinterest/callback'
);

const pinterestAuth = (req, res) => {
  if (!pinterestClientId) {
    return res.status(500).json({ message: 'PINTEREST_CLIENT_ID is not configured' });
  }

  const redirectUri = getEffectivePinterestRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect
    ? toState({ redirect: callbackRedirect, nonce: crypto.randomBytes(8).toString('hex') })
    : crypto.randomBytes(8).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    client_id: pinterestClientId,
    scope: pinterestScopes,
    state,
  });

  const authUrl = `https://www.pinterest.com/oauth/?${params.toString()}`;
  return res.redirect(authUrl);
};

const pinterestCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'pinterest',
      appSecret: pinterestClientSecret,
      appSecretEnvKey: 'PINTEREST_CLIENT_SECRET',
      appId: pinterestClientId,
      getRedirectUri: getEffectivePinterestRedirectUri,
      exchangeFn: exchangePinterestCodeForToken,
      getErrorFromData: (data) => {
        if (!data) {
          return null;
        }
        if (data.error) {
          return {
            error: String(data.error),
            description: data.error_description || JSON.stringify(data),
          };
        }
        return null;
      },
    });
  } catch (err) {
    console.error('Pinterest OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  pinterestAuth,
  pinterestCallback,
};

