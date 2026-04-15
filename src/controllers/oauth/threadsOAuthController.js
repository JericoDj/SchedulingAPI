const { threadsAppId, threadsAppSecret, threadsRedirectUri, threadsScopes } = require('../../config/env');
const {
  crypto,
  getBaseUrl,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  handleOAuthCallback,
  exchangeThreadsCodeForToken,
  decodeThreadsSignedRequest,
} = require('./shared');

const getEffectiveThreadsRedirectUri = createRedirectUriResolver(
  threadsRedirectUri,
  '/api/oauth/threads/callback'
);

const threadsAuth = (req, res) => {
  if (!threadsAppId) {
    return res.status(500).json({ message: 'THREADS_APP_ID is not configured' });
  }

  const redirectUri = getEffectiveThreadsRedirectUri(req);
  const callbackRedirect = getCallbackRedirect(req);
  const state = callbackRedirect ? toState({ redirect: callbackRedirect }) : undefined;

  const params = new URLSearchParams({
    client_id: threadsAppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: threadsScopes,
  });

  if (state) {
    params.set('state', state);
  }

  const authUrl = `https://www.threads.net/oauth/authorize?${params.toString()}`;
  return res.redirect(authUrl);
};

const threadsCallback = async (req, res) => {
  try {
    return await handleOAuthCallback({
      req,
      res,
      provider: 'threads',
      appSecret: threadsAppSecret,
      appSecretEnvKey: 'THREADS_APP_SECRET',
      appId: threadsAppId,
      getRedirectUri: getEffectiveThreadsRedirectUri,
      exchangeFn: exchangeThreadsCodeForToken,
    });
  } catch (err) {
    console.error('Threads OAuth Callback Error:', err);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

const threadsUninstallCallback = (req, res) => {
  const signedRequest = req.body?.signed_request || req.query?.signed_request;
  const payload = decodeThreadsSignedRequest(signedRequest, threadsAppSecret);

  console.log('Threads uninstall callback received', {
    hasPayload: Boolean(payload),
    userId: payload?.user_id || null,
    issuedAt: payload?.issued_at || null,
  });

  return res.status(200).json({ success: true });
};

const threadsDeleteCallback = (req, res) => {
  const signedRequest = req.body?.signed_request || req.query?.signed_request;
  const payload = decodeThreadsSignedRequest(signedRequest, threadsAppSecret);
  const confirmationCode = crypto.randomBytes(8).toString('hex');
  const statusUrl = `${getBaseUrl(req)}/api/oauth/threads/delete/status?code=${confirmationCode}`;

  console.log('Threads delete callback received', {
    hasPayload: Boolean(payload),
    userId: payload?.user_id || null,
    issuedAt: payload?.issued_at || null,
    confirmationCode,
  });

  return res.status(200).json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
};

const threadsDeleteStatus = (req, res) => {
  const code = req.query.code || 'unknown';
  return res.status(200).json({
    status: 'completed',
    confirmation_code: code,
  });
};

module.exports = {
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
};

