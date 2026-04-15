const express = require('express');
const { facebookAuth, facebookCallback } = require('../controllers/facebookController');
const { instagramAuth, instagramCallback } = require('../controllers/instagramController');
const {
  threadsAuth,
  threadsCallback,
  threadsUninstallCallback,
  threadsDeleteCallback,
  threadsDeleteStatus,
} = require('../controllers/threadsController');
const { tiktokAuth, tiktokCallback } = require('../controllers/tiktokController');
const { linkedinAuth, linkedinCallback } = require('../controllers/linkedinController');
const { xAuth, xCallback } = require('../controllers/xController');
const { youtubeAuth, youtubeCallback } = require('../controllers/youtubeController');
const { pinterestAuth, pinterestCallback } = require('../controllers/pinterestController');

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
router.get('/linkedin', linkedinAuth);
router.get('/linkedin/callback', linkedinCallback);
router.get('/x', xAuth);
router.get('/x/callback', xCallback);
router.get('/youtube', youtubeAuth);
router.get('/youtube/callback', youtubeCallback);
router.get('/pinterest', pinterestAuth);
router.get('/pinterest/callback', pinterestCallback);

module.exports = router;
