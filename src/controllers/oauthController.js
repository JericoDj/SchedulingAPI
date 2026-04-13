const {
  facebookAppId,
  facebookAppSecret,
  facebookRedirectUri,
  facebookScopes,
  graphApiVersion,
  instagramAppId,
  instagramAppSecret,
  instagramRedirectUri,
  instagramScopes,
} = require('../config/env');

const isLocalHost = (host) => {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

const enforceHttpsForPublicUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch (_) {
    return urlString;
  }
};

const getBaseUrl = (req) => {
  const host = req.get('host');
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
  return `${protocol}://${host}`;
};

const getEffectiveFacebookRedirectUri = (req) => {
  const redirectUri = facebookRedirectUri || `${getBaseUrl(req)}/api/oauth/facebook/callback`;
  return enforceHttpsForPublicUrl(redirectUri);
};

const getEffectiveInstagramRedirectUri = (req) => {
  const redirectUri = instagramRedirectUri || `${getBaseUrl(req)}/api/oauth/instagram/callback`;
  return enforceHttpsForPublicUrl(redirectUri);
};

const getCallbackRedirect = (req) => {
  const redirect = req.query.redirect;
  return typeof redirect === 'string' && redirect.trim() ? redirect.trim() : null;
};

const toState = (stateObj) => {
  return Buffer.from(JSON.stringify(stateObj), 'utf8').toString('base64url');
};

const fromState = (state) => {
  if (!state || typeof state !== 'string') {
    return {};
  }

  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch (_) {
    return {};
  }
};

const buildFrontendErrorRedirect = (frontendRedirect, provider, error, description) => {
  const redirectUrl = new URL(frontendRedirect);
  redirectUrl.searchParams.set('provider', provider);
  redirectUrl.searchParams.set('status', 'error');
  redirectUrl.searchParams.set('error', error);
  if (description) {
    redirectUrl.searchParams.set('description', description);
  }
  return redirectUrl.toString();
};

const buildFrontendSuccessRedirect = (frontendRedirect, provider, tokenData) => {
  const redirectUrl = new URL(frontendRedirect);
  redirectUrl.searchParams.set('provider', provider);
  redirectUrl.searchParams.set('status', 'success');
  redirectUrl.searchParams.set('access_token', tokenData.access_token || '');
  redirectUrl.searchParams.set('token_type', tokenData.token_type || '');
  redirectUrl.searchParams.set('expires_in', String(tokenData.expires_in || ''));
  return redirectUrl.toString();
};

const exchangeCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}) => {
  const tokenUrl = `https://graph.facebook.com/${graphApiVersion}/oauth/access_token`;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    client_secret: appSecret,
    code,
  });

  const response = await fetch(`${tokenUrl}?${params.toString()}`);
  const data = await response.json();
  return { response, data };
};

const handleOAuthCallback = async ({
  req,
  res,
  provider,
  appSecret,
  appSecretEnvKey,
  appId,
  getRedirectUri,
}) => {
  const { code, error, error_description, state } = req.query;
  const parsedState = fromState(state);
  const frontendRedirect =
    typeof parsedState.redirect === 'string' && parsedState.redirect.trim()
      ? parsedState.redirect.trim()
      : null;

  if (error) {
    if (frontendRedirect) {
      return res.redirect(
        buildFrontendErrorRedirect(frontendRedirect, provider, error, error_description)
      );
    }
    return res.status(400).json({ error, description: error_description });
  }

  if (!code) {
    if (frontendRedirect) {
      return res.redirect(
        buildFrontendErrorRedirect(
          frontendRedirect,
          provider,
          'authorization_code_missing'
        )
      );
    }
    return res.status(400).json({ message: 'Authorization code missing' });
  }

  if (!appSecret) {
    if (frontendRedirect) {
      return res.redirect(
        buildFrontendErrorRedirect(
          frontendRedirect,
          provider,
          `${provider}_app_secret_missing`
        )
      );
    }
    return res.status(500).json({ message: `${appSecretEnvKey} is not configured` });
  }

  const redirectUri = getRedirectUri(req);
  const { response, data } = await exchangeCodeForToken({
    appId,
    appSecret,
    redirectUri,
    code,
  });

  if (!response.ok) {
    if (frontendRedirect) {
      return res.redirect(
        buildFrontendErrorRedirect(
          frontendRedirect,
          provider,
          'token_exchange_failed',
          encodeURIComponent(JSON.stringify(data))
        )
      );
    }
    return res.status(response.status).json({ message: 'Error exchanging token', details: data });
  }

  if (frontendRedirect) {
    return res.redirect(buildFrontendSuccessRedirect(frontendRedirect, provider, data));
  }

  return res.status(200).json({
    message: `Successfully authenticated with ${provider}`,
    tokenData: data,
  });
};

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
  res.redirect(authUrl);
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
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

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
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  facebookAuth,
  facebookCallback,
  instagramAuth,
  instagramCallback,
};
