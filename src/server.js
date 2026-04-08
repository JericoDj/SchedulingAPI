const { deployment, nodeEnv, port, validateEnv } = require('./config/env');

validateEnv();

const app = require('./app');

const shouldListen =
  deployment !== 'production' &&
  nodeEnv !== 'production' &&
  process.env.VERCEL !== '1';

if (shouldListen) {
  app.listen(port, () => {
    console.log(`API running on port ${port} in ${nodeEnv} mode`);
  });
}

module.exports = app;
