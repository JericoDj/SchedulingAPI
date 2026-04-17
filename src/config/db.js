const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

const { databaseUrl } = require('./env');

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on('error', (error) => {
  console.error('Unexpected Neon pool error:', error);
});

const query = (text, params = []) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
};
