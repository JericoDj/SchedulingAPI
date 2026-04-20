const { deployment, nodeEnv, port, validateEnv } = require('./config/env');
const { runMigrations } = require('./config/migrations');

validateEnv();

const app = require('./app');

const shouldListen =
  deployment !== 'production' &&
  nodeEnv !== 'production' &&
  process.env.VERCEL !== '1';

if (shouldListen) {
  runMigrations().then(() => {
    const server = app.listen(port, () => {
      console.log(`API running on port ${port} in ${nodeEnv} mode`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Exiting so --watch can retry...`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

    // Graceful shutdown for --watch mode hot restarts
    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
      // Force-exit if server.close() hangs
      setTimeout(() => process.exit(0), 500).unref();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}

module.exports = app;
