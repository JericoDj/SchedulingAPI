const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const cleanEnvValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().replace(/^['"]|['"]$/g, '');
};

const getFirstDefinedEnvValue = (...keys) => {
  for (const key of keys) {
    const value = cleanEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const normalizeSpaceDelimitedScopes = (value, fallback) => {
  const raw = cleanEnvValue(value) || fallback;
  return String(raw)
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
    .join(' ');
};

const normalizeCommaDelimitedScopes = (value, fallback) => {
  const raw = cleanEnvValue(value) || fallback;
  return String(raw)
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
    .join(',');
};

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  deployment: process.env.DEPLOYMENT || 'local',
  databaseUrl: cleanEnvValue(process.env.DATABASE_URL),
  jwtSecret: cleanEnvValue(process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: cleanEnvValue(process.env.CLIENT_URL) || '*',
  graphApiVersion: process.env.GRAPH_API_VERSION || 'v24.0',
  facebookAppId: cleanEnvValue(process.env.FACEBOOK_APP_ID),
  facebookAppSecret: cleanEnvValue(process.env.FACEBOOK_APP_SECRET),
  facebookRedirectUri: cleanEnvValue(process.env.FACEBOOK_REDIRECT_URI),
  facebookScopes:
    process.env.FACEBOOK_SCOPES || 'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts',
  instagramAppId:
    cleanEnvValue(process.env.INSTAGRAM_APP_ID) || cleanEnvValue(process.env.FACEBOOK_APP_ID),
  instagramAppSecret:
    cleanEnvValue(process.env.INSTAGRAM_APP_SECRET) || cleanEnvValue(process.env.FACEBOOK_APP_SECRET),
  instagramRedirectUri: cleanEnvValue(process.env.INSTAGRAM_REDIRECT_URI),
  instagramScopes:
    process.env.INSTAGRAM_SCOPES ||
    'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
  threadsAppId: cleanEnvValue(process.env.THREADS_APP_ID),
  threadsAppSecret: cleanEnvValue(process.env.THREADS_APP_SECRET),
  threadsRedirectUri: cleanEnvValue(process.env.THREADS_REDIRECT_URI),
  threadsScopes:
    process.env.THREADS_SCOPES || 'threads_basic,threads_content_publish',
  linkedinClientId: cleanEnvValue(process.env.LINKEDIN_CLIENT_ID),
  linkedinClientSecret: cleanEnvValue(process.env.LINKEDIN_CLIENT_SECRET),
  linkedinRedirectUri: cleanEnvValue(process.env.LINKEDIN_REDIRECT_URI),
  linkedinScopes: normalizeSpaceDelimitedScopes(
    process.env.LINKEDIN_SCOPES,
    'openid profile email w_member_social r_profile_basicinfo r_verify'
  ),
  tiktokClientKey: cleanEnvValue(process.env.TIKTOK_CLIENT_KEY),
  tiktokClientSecret: cleanEnvValue(process.env.TIKTOK_CLIENT_SECRET),
  tiktokRedirectUri: cleanEnvValue(process.env.TIKTOK_REDIRECT_URI),
  tiktokScopes:
    process.env.TIKTOK_SCOPES ||
    'user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish',
  xClientId: getFirstDefinedEnvValue(
    'X_CLIENT_ID',
    'X_OAUTH_2_0_CLIENT_ID',
    'X_OAUTH_2.0_CLIENT_ID'
  ),
  xClientSecret: getFirstDefinedEnvValue(
    'X_CLIENT_SECRET',
    'X_OAUTH_2_0_CLIENT_SECRET',
    'X_OAUTH_2.0_CLIENT_SECRET'
  ),
  xRedirectUri: cleanEnvValue(process.env.X_REDIRECT_URI),
  xScopes:
    process.env.X_SCOPES || 'tweet.read tweet.write users.read offline.access',
  youtubeClientId: getFirstDefinedEnvValue(
    'YOUTUBE_CLIENT_ID',
    'GOOGLE_YOUTUBE_OAUTH_SOCIALSYNC_CLIENT_ID'
  ),
  youtubeClientSecret: getFirstDefinedEnvValue(
    'YOUTUBE_CLIENT_SECRET',
    'GOOGLE_YOUTUBE_OAUTH_SOCIALSYNC_CLIENT_SECRET'
  ),
  youtubeRedirectUri: cleanEnvValue(process.env.YOUTUBE_REDIRECT_URI),
  youtubeScopes: normalizeSpaceDelimitedScopes(
    process.env.YOUTUBE_SCOPES,
    'openid profile email https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload'
  ),
  pinterestClientId: cleanEnvValue(process.env.PINTEREST_CLIENT_ID),
  pinterestClientSecret: cleanEnvValue(process.env.PINTEREST_CLIENT_SECRET),
  pinterestRedirectUri: cleanEnvValue(process.env.PINTEREST_REDIRECT_URI),
  pinterestScopes: normalizeCommaDelimitedScopes(
    process.env.PINTEREST_SCOPES,
    'user_accounts:read,boards:read,pins:read,pins:write'
  ),
};

const validateEnv = () => {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

module.exports = {
  ...env,
  validateEnv,
};
