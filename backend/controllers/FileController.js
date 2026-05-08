import express from 'express';
import multer from 'multer';
import FileService, { FileCategory } from '../services/FileService.js';
import { authenticateToken, requireRole } from './authController.js';

const router = express.Router();

// User roles enum
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/json', 'application/xml'
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`), false);
    }
  }
});
// UPLOAD FILE API
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { related_type, related_id } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    if (!related_type || !related_id) {
      return res.status(400).json({
        success: false,
        message: 'Related type and ID are required'
      });
    }

    // Validate related_type
    const validRelatedTypes = ['task', 'project', 'user'];
    if (!validRelatedTypes.includes(related_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid related type'
      });
    }

    if (isNaN(related_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid related ID'
      });
    }

    const result = await FileService.uploadFile(
      req.file,
      req.user.userId,
      related_type,
      parseInt(related_id)
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result.data
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the maximum limit'
        });
      }
    }

    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// GET FILE BY ID API
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID'
      });
    }

    const result = await FileService.getFileById(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'File found',
        data: result.data
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DOWNLOAD FILE API
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID'
      });
    }

    const result = await FileService.downloadFile(parseInt(id));

    if (result.success) {
      const { buffer, filename, mimetype } = result.data;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', mimetype);
      res.send(buffer);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});



export default router;