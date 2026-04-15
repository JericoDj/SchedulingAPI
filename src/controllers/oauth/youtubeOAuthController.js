const { youtubeClientId, youtubeClientSecret, youtubeRedirectUri, youtubeScopes } = require('../../config/env');
const {
  crypto,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
  exchangeYouTubeCodeForToken,
} = require('./shared');

const getEffectiveYouTubeRedirectUri = createRedirectUriResolver(
  youtubeRedirectUri,
  '/api/oauth/youtube/callback'
);

const youtubeAuth = (req, res) => {
  if (!youtubeClientId) {
    return res.status(500).json({ message: 'YOUTUBE_CLIENT_ID is not configured' });
  }

  const redirectUri = getEffectiveYouTubeRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect
    ? toState({ redirect: callbackRedirect, nonce: crypto.randomBytes(8).toString('hex') })
    : crypto.randomBytes(8).toString('hex');

  const params = new URLSearchParams({
    client_id: youtubeClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: youtubeScopes,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(authUrl);
};

const youtubeCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'youtube',
      appSecret: youtubeClientSecret,
      appSecretEnvKey: 'YOUTUBE_CLIENT_SECRET',
      appId: youtubeClientId,
      getRedirectUri: getEffectiveYouTubeRedirectUri,
      exchangeFn: exchangeYouTubeCodeForToken,
      getErrorFromData: (data) => {
        if (!data) {
          return null;
        }
        if (data.error) {
          return {
            error: String(data.error),
            description: data.error_description || data.error || JSON.stringify(data),
          };
        }
        return null;
      },
    });
  } catch (err) {
    console.error('YouTube OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  youtubeAuth,
  youtubeCallback,
};

