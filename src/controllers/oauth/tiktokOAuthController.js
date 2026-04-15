const { tiktokClientKey, tiktokClientSecret, tiktokRedirectUri, tiktokScopes } = require('../../config/env');
const {
  crypto,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  fromState,
  handleOAuthCallback,
  exchangeTikTokCodeForToken,
} = require('./shared');

const getEffectiveTikTokRedirectUri = createRedirectUriResolver(
  tiktokRedirectUri,
  '/api/oauth/tiktok/callback'
);

const tiktokAuth = (req, res) => {
  if (!tiktokClientKey) {
    return res.status(500).json({ message: 'TIKTOK_CLIENT_KEY is not configured' });
  }

  const redirectUri = getEffectiveTikTokRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const nonce = crypto.randomBytes(8).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('hex');
  const state = toState({
    nonce,
    redirect: callbackRedirect || undefined,
    codeVerifier,
  });

  const params = new URLSearchParams({
    client_key: tiktokClientKey,
    scope: tiktokScopes,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  return res.redirect(authUrl);
};

const tiktokCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'tiktok',
      appSecret: tiktokClientSecret,
      appSecretEnvKey: 'TIKTOK_CLIENT_SECRET',
      appId: tiktokClientKey,
      getRedirectUri: getEffectiveTikTokRedirectUri,
      exchangeFn: exchangeTikTokCodeForToken,
      getExchangeArgs: (request) => {
        const parsedState = fromState(request.query.state);
        return parsedState?.codeVerifier
          ? { codeVerifier: parsedState.codeVerifier }
          : {};
      },
      normalizeTokenData: (data) => data?.data || data,
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
        if (typeof data.error_code === 'number' && data.error_code !== 0) {
          return {
            error: String(data.error_code),
            description: data.error || data.description || JSON.stringify(data),
          };
        }
        return null;
      },
    });
  } catch (err) {
    console.error('TikTok OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  tiktokAuth,
  tiktokCallback,
};

