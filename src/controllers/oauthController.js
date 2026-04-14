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
  threadsAppId,
  threadsAppSecret,
  threadsRedirectUri,
  threadsScopes,
  tiktokClientKey,
  tiktokClientSecret,
  tiktokRedirectUri,
  tiktokScopes,
} = require('../config/env');
const crypto = require('crypto');

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

const getEffectiveThreadsRedirectUri = (req) => {
  const redirectUri = threadsRedirectUri || `${getBaseUrl(req)}/api/oauth/threads/callback`;
  return enforceHttpsForPublicUrl(redirectUri);
};

const getEffectiveTikTokRedirectUri = (req) => {
  const redirectUri = tiktokRedirectUri || `${getBaseUrl(req)}/api/oauth/tiktok/callback`;
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

const exchangeThreadsCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}) => {
  const tokenUrl = 'https://graph.threads.net/oauth/access_token';
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await response.json();
  return { response, data };
};

const exchangeTikTokCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
  codeVerifier,
}) => {
  const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  const params = new URLSearchParams({
    client_key: appId,
    client_secret: appSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await response.json();
  return { response, data };
};

const decodeThreadsSignedRequest = (signedRequest, appSecret) => {
  if (!signedRequest || typeof signedRequest !== 'string') {
    return null;
  }

  const [encodedSig, encodedPayload] = signedRequest.split('.');
  if (!encodedSig || !encodedPayload) {
    return null;
  }

  const signature = Buffer.from(encodedSig, 'base64url');
  const expected = crypto
    .createHmac('sha256', appSecret || '')
    .update(encodedPayload)
    .digest();

  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    return JSON.parse(payloadJson);
  } catch (_) {
    return null;
  }
};

const handleOAuthCallback = async ({
  req,
  res,
  provider,
  appSecret,
  appSecretEnvKey,
  appId,
  getRedirectUri,
  exchangeFn = exchangeCodeForToken,
  normalizeTokenData = (data) => data,
  getErrorFromData = () => null,
  getExchangeArgs = () => ({}),
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
  const { response, data } = await exchangeFn({
    appId,
    appSecret,
    redirectUri,
    code,
    ...getExchangeArgs(req),
  });

  const dataError = getErrorFromData(data);

  if (!response.ok || dataError) {
    const errorCode = dataError?.error || 'token_exchange_failed';
    const errorDescription = dataError?.description || JSON.stringify(data);
    if (frontendRedirect) {
      return res.redirect(
        buildFrontendErrorRedirect(
          frontendRedirect,
          provider,
          errorCode,
          errorDescription
        )
      );
    }
    return res.status(response.status).json({ message: 'Error exchanging token', details: data });
  }

  const tokenData = normalizeTokenData(data);

  if (frontendRedirect) {
    return res.redirect(buildFrontendSuccessRedirect(frontendRedirect, provider, tokenData));
  }

  return res.status(200).json({
    message: `Successfully authenticated with ${provider}`,
    tokenData,
    rawTokenData: tokenData === data ? undefined : data,
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
    res.status(500).json({ message: 'Internal server error during authentication' });
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
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  facebookAuth,
  facebookCallback,
  instagramAuth,
  instagramCallback,
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
  tiktokAuth,
  tiktokCallback,
};
