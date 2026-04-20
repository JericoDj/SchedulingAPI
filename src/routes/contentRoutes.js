const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  uploadMedia,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
} = require('../controllers/contentController');

const router = express.Router();

// Multer configuration (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

router.use(protect);

router.post('/upload', upload.single('file'), uploadMedia);
router.get('/', getAllContent);
router.get('/:id', getContentById);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

module.exports = router;
