const jwt = require('jsonwebtoken');

const { jwtSecret } = require('../config/env');
const userModel = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('Authorization token is missing');
    }

    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret);
    const user = await userModel.findById(decoded.id);

    if (!user) {
      res.status(401);
      throw new Error('User linked to token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    next(error);
  }
};

module.exports = {
  protect,
};
