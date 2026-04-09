const { facebookAppId, facebookAppSecret, facebookRedirectUri } = require('../config/env');

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
    scope: 'public_profile,email',
  });

  if (state) {
    params.set('state', state);
  }

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  res.redirect(authUrl);
};

const facebookCallback = async (req, res) => {
  try {
    const { code, error, error_description, state } = req.query;
    const parsedState = fromState(state);
    const frontendRedirect =
      typeof parsedState.redirect === 'string' && parsedState.redirect.trim()
        ? parsedState.redirect.trim()
        : null;

    if (error) {
      if (frontendRedirect) {
        const redirectUrl = new URL(frontendRedirect);
        redirectUrl.searchParams.set('provider', 'facebook');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('error', error);
        if (error_description) {
          redirectUrl.searchParams.set('description', error_description);
        }
        return res.redirect(redirectUrl.toString());
      }

      return res.status(400).json({ error, description: error_description });
    }

    if (!code) {
      if (frontendRedirect) {
        const redirectUrl = new URL(frontendRedirect);
        redirectUrl.searchParams.set('provider', 'facebook');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('error', 'authorization_code_missing');
        return res.redirect(redirectUrl.toString());
      }

      return res.status(400).json({ message: 'Authorization code missing' });
    }

    if (!facebookAppSecret) {
      if (frontendRedirect) {
        const redirectUrl = new URL(frontendRedirect);
        redirectUrl.searchParams.set('provider', 'facebook');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('error', 'facebook_app_secret_missing');
        return res.redirect(redirectUrl.toString());
      }

      return res.status(500).json({ message: 'FACEBOOK_APP_SECRET is not configured' });
    }

    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const redirectUri = getEffectiveFacebookRedirectUri(req);
    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: redirectUri,
      client_secret: facebookAppSecret,
      code,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      if (frontendRedirect) {
        const redirectUrl = new URL(frontendRedirect);
        redirectUrl.searchParams.set('provider', 'facebook');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('error', 'token_exchange_failed');
        redirectUrl.searchParams.set('details', encodeURIComponent(JSON.stringify(data)));
        return res.redirect(redirectUrl.toString());
      }

      return res.status(response.status).json({ message: 'Error exchanging token', details: data });
    }

    if (frontendRedirect) {
      const redirectUrl = new URL(frontendRedirect);
      redirectUrl.searchParams.set('provider', 'facebook');
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('access_token', data.access_token || '');
      redirectUrl.searchParams.set('token_type', data.token_type || '');
      redirectUrl.searchParams.set('expires_in', String(data.expires_in || ''));
      return res.redirect(redirectUrl.toString());
    }

    return res.status(200).json({
      message: 'Successfully authenticated with Facebook',
      tokenData: data
    });
  } catch (err) {
    console.error('Facebook OAuth Callback Error:', err);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

module.exports = {
  facebookAuth,
  facebookCallback,
};
