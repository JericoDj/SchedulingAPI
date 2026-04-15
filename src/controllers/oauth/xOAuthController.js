const { xClientId, xClientSecret, xRedirectUri, xScopes } = require('../../config/env');
const {
  crypto,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  fromState,
  handleOAuthCallback,
  exchangeXCodeForToken,
} = require('./shared');

const getEffectiveXRedirectUri = createRedirectUriResolver(
  xRedirectUri,
  '/api/oauth/x/callback'
);

const xAuth = (req, res) => {
  if (!xClientId) {
    return res.status(500).json({ message: 'X client ID is not configured. Set X_CLIENT_ID (or X_OAUTH_2_0_CLIENT_ID).' });
  }

  const redirectUri = getEffectiveXRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const nonce = crypto.randomBytes(8).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = toState({
    nonce,
    redirect: callbackRedirect || undefined,
    codeVerifier,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: xClientId,
    redirect_uri: redirectUri,
    scope: xScopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  return res.redirect(authUrl);
};

const xCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'x',
      appSecret: xClientSecret,
      requireAppSecret: false,
      appSecretEnvKey: 'X_CLIENT_SECRET',
      appId: xClientId,
      getRedirectUri: getEffectiveXRedirectUri,
      exchangeFn: exchangeXCodeForToken,
      getExchangeArgs: (request) => {
        const parsedState = fromState(request.query.state);
        return parsedState?.codeVerifier
          ? { codeVerifier: parsedState.codeVerifier }
          : {};
      },
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
    console.error('X OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  xAuth,
  xCallback,
};

