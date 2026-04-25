const crypto = require('crypto');
const { graphApiVersion } = require('../../config/env');

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

const createRedirectUriResolver = (configuredUri, callbackPath) => {
  return (req) => {
    const redirectUri = configuredUri || `${getBaseUrl(req)}${callbackPath}`;
    return enforceHttpsForPublicUrl(redirectUri);
  };
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
  if (tokenData.refresh_token) {
    redirectUrl.searchParams.set('refresh_token', tokenData.refresh_token);
  }
  return redirectUrl.toString();
};

const exchangeGraphCodeForToken = async ({
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

const exchangeLinkedInCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}) => {
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
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

const exchangeXCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
  codeVerifier,
}) => {
  const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: appId,
    code,
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (appSecret) {
    const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString(),
  });
  const data = await response.json();
  return { response, data };
};

const exchangeYouTubeCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}) => {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    code,
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
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

const exchangePinterestCodeForToken = async ({
  appId,
  appSecret,
  redirectUri,
  code,
}) => {
  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
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
  requireAppSecret = true,
  appSecretEnvKey,
  appId,
  getRedirectUri,
  exchangeFn = exchangeGraphCodeForToken,
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

  if (requireAppSecret && !appSecret) {
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

module.exports = {
  crypto,
  graphApiVersion,
  getBaseUrl,
  createRedirectUriResolver,
  getCallbackRedirect,
  toState,
  fromState,
  handleOAuthCallback,
  exchangeGraphCodeForToken,
  exchangeThreadsCodeForToken,
  exchangeTikTokCodeForToken,
  exchangeLinkedInCodeForToken,
  exchangeXCodeForToken,
  exchangeYouTubeCodeForToken,
  exchangePinterestCodeForToken,
  decodeThreadsSignedRequest,
};
