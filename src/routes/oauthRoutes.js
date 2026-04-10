const express = require('express');
const {
  facebookAuth,
  facebookCallback,
  instagramAuth,
  instagramCallback,
} = require('../controllers/oauthController');

const router = express.Router();

router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);
router.get('/instagram', instagramAuth);
router.get('/instagram/callback', instagramCallback);

module.exports = router;
