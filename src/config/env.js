const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  deployment: process.env.DEPLOYMENT || 'local',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || '*',
  graphApiVersion: process.env.GRAPH_API_VERSION || 'v24.0',
  facebookAppId: process.env.FACEBOOK_APP_ID,
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI,
  facebookScopes:
    process.env.FACEBOOK_SCOPES || 'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts',
  instagramAppId: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID,
  instagramAppSecret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET,
  instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  instagramScopes:
    process.env.INSTAGRAM_SCOPES ||
    'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
  threadsAppId: process.env.THREADS_APP_ID,
  threadsAppSecret: process.env.THREADS_APP_SECRET,
  threadsRedirectUri: process.env.THREADS_REDIRECT_URI,
  threadsScopes:
    process.env.THREADS_SCOPES || 'threads_basic,threads_content_publish',
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_APP_ID,
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_APP_SECRET,
  tiktokRedirectUri: process.env.TIKTOK_REDIRECT_URI,
  tiktokScopes:
    process.env.TIKTOK_SCOPES || 'user.info.basic,video.upload,video.publish',
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
