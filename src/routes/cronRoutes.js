const express = require('express');

const { runScheduler } = require('../controllers/scheduleController');

const router = express.Router();

router.get('/', runScheduler);

module.exports = router;
