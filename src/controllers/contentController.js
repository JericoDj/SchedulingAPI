const { bucket } = require('../config/firebase');
const contentModel = require('../models/contentModel');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Upload media to Firebase and save metadata in DB
 * @route   POST /api/content/upload
 * @access  Private
 */
const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!bucket) {
      return res.status(503).json({ error: 'Firebase storage is not configured' });
    }

    const { title, description, format_category, platform } = req.body;
    const userId = req.user.id;
    
    // Determine media type and plural folder name
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const mediaFolder = mediaType === 'video' ? 'videos' : 'images';
    
    // Determine platform folder name (default to 'general' if not provided)
    const platformFolder = platform || 'general';

    const filename = `${uuidv4()}${path.extname(req.file.originalname)}`;
    const filePath = `socialsync/socialmedia/${platformFolder}/${userId}/${mediaFolder}/${filename}`;
    const file = bucket.file(filePath);

    // Stream upload to Firebase
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('Firebase upload error:', err);
      res.status(500).json({ error: 'Failed to upload to storage' });
    });

    stream.on('finish', async () => {
      try {
        // Make the file publicly accessible (optional, depends on your bucket settings)
        await file.makePublic();
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        const contentData = {
          user_id: userId,
          file_url: fileUrl,
          file_path: filePath,
          file_name: req.file.originalname,
          file_type: req.file.mimetype,
          media_type: mediaType,
          platform: platform || null,
          format_category: format_category || 'general',
          title: title || req.file.originalname,
          description: description || '',
          metadata: {
            size: req.file.size,
          },
        };

        const newContent = await contentModel.create(contentData);

        res.status(201).json({
          message: 'File uploaded successfully',
          content: newContent,
        });
      } catch (err) {
        next(err);
      }
    });

    stream.end(req.file.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all content for the authenticated user
 * @route   GET /api/content
 * @access  Private
 */
const getAllContent = async (req, res, next) => {
  try {
    const { media_type, format_category, platform } = req.query;
    const content = await contentModel.findAllByUser(req.user.id, {
      media_type,
      format_category,
      platform,
    });

    res.status(200).json({
      count: content.length,
      content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single content metadata
 * @route   GET /api/content/:id
 * @access  Private
 */
const getContentById = async (req, res, next) => {
  try {
    const content = await contentModel.findById(req.params.id, req.user.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.status(200).json(content);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update content metadata
 * @route   PUT /api/content/:id
 * @access  Private
 */
const updateContent = async (req, res, next) => {
  try {
    const updatedContent = await contentModel.update(req.params.id, req.user.id, req.body);
    if (!updatedContent) {
      return res.status(404).json({ error: 'Content not found or not authorized' });
    }
    res.status(200).json({
      message: 'Content updated successfully',
      content: updatedContent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete content from storage and DB
 * @route   DELETE /api/content/:id
 * @access  Private
 */
const deleteContent = async (req, res, next) => {
  try {
    const content = await contentModel.findById(req.params.id, req.user.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Delete from Firebase Storage
    if (bucket) {
      try {
        await bucket.file(content.file_path).delete();
      } catch (err) {
        console.warn('File not found in storage, but deleting from DB anyway:', err.message);
      }
    }

    // Delete from DB
    await contentModel.delete(req.params.id, req.user.id);

    res.status(200).json({ message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMedia,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
};
