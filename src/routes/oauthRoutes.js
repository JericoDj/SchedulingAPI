const express = require('express');
const { facebookAuth, facebookCallback } = require('../controllers/oauthController');

const router = express.Router();

router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);

module.exports = router;
