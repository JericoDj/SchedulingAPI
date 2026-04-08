const jwt = require('jsonwebtoken');

const { jwtExpiresIn, jwtSecret } = require('../config/env');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
};

module.exports = generateToken;
