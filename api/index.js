const { validateEnv } = require('../src/config/env');

validateEnv();

const app = require('../src/app');

module.exports = app;
