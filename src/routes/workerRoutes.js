const express = require('express');

const { getWorkerDbHealth, runSchedulerWorker } = require('../controllers/scheduleController');
const { protectWorker } = require('../middleware/workerAuthMiddleware');

const router = express.Router();

router.post('/scheduler/run', protectWorker, runSchedulerWorker);
router.get('/db-health', protectWorker, getWorkerDbHealth);

module.exports = router;
