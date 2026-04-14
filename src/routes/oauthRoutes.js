const express = require('express');
const {
  facebookAuth,
  facebookCallback,
  instagramAuth,
  instagramCallback,
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
  tiktokAuth,
  tiktokCallback,
} = require('../controllers/oauthController');

const router = express.Router();

router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);
router.get('/instagram', instagramAuth);
router.get('/instagram/callback', instagramCallback);
router.get('/threads', threadsAuth);
router.get('/threads/callback', threadsCallback);
router.post('/threads/uninstall', threadsUninstallCallback);
router.post('/threads/delete', threadsDeleteCallback);
router.get('/threads/delete/status', threadsDeleteStatus);
router.get('/tiktok', tiktokAuth);
router.get('/tiktok/callback', tiktokCallback);

module.exports = router;
