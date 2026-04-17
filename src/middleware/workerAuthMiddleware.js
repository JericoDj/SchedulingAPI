const { workerSharedSecret } = require('../config/env');

const protectWorker = (req, res, next) => {
  if (!workerSharedSecret) {
    res.status(503);
    return next(new Error('WORKER_SHARED_SECRET is not configured on the backend'));
  }

  const incomingSecret = req.header('x-worker-secret');

  if (!incomingSecret || incomingSecret !== workerSharedSecret) {
    res.status(401);
    return next(new Error('Unauthorized worker request'));
  }

  next();
};

module.exports = {
  protectWorker,
};
