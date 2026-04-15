const { linkedinClientId, linkedinClientSecret, linkedinRedirectUri, linkedinScopes } = require('../../config/env');
const {
  crypto,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
  exchangeLinkedInCodeForToken,
} = require('./shared');

const getEffectiveLinkedInRedirectUri = createRedirectUriResolver(
  linkedinRedirectUri,
  '/api/oauth/linkedin/callback'
);

const linkedinAuth = (req, res) => {
  if (!linkedinClientId) {
    return res.status(500).json({ message: 'LINKEDIN_CLIENT_ID is not configured' });
  }

  const redirectUri = getEffectiveLinkedInRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect
    ? toState({ redirect: callbackRedirect, nonce: crypto.randomBytes(8).toString('hex') })
    : crypto.randomBytes(8).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedinClientId,
    redirect_uri: redirectUri,
    scope: linkedinScopes,
    state,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  return res.redirect(authUrl);
};

const linkedinCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'linkedin',
      appSecret: linkedinClientSecret,
      appSecretEnvKey: 'LINKEDIN_CLIENT_SECRET',
      appId: linkedinClientId,
      getRedirectUri: getEffectiveLinkedInRedirectUri,
      exchangeFn: exchangeLinkedInCodeForToken,
      getErrorFromData: (data) => {
        if (!data) {
          return null;
        }
        if (data.error) {
          return {
            error: String(data.error),
            description: data.error_description || data.errorMessage || JSON.stringify(data),
          };
        }
        return null;
      },
    });
  } catch (err) {
    console.error('LinkedIn OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  linkedinAuth,
  linkedinCallback,
};

