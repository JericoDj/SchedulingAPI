const { facebookAppId, facebookAppSecret, facebookRedirectUri } = require('../config/env');

const facebookAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id: facebookAppId,
    redirect_uri: facebookRedirectUri,
    response_type: 'code',
    scope: 'public_profile,email', // Adjust scopes as needed
  });
  
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  res.redirect(authUrl);
};

const facebookCallback = async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({ error, description: error_description });
    }

    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    // Exchange code for token
    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: facebookRedirectUri,
      client_secret: facebookAppSecret,
      code,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ message: 'Error exchanging token', details: data });
    }

    // Return the token payload to the client
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
