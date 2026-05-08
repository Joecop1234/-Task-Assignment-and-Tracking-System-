import Database from '../database/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import mime from 'mime-types';

// File type categories
export const FileCategory = {
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
  ARCHIVE: 'ARCHIVE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  OTHER: 'OTHER'
};

class FileService {
  
  // File upload configuration
  static getUploadConfig() {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default

    return {
      uploadDir,
      maxFileSize,
      allowedTypes: [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Spreadsheets
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Presentations
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        // Others
        'application/json', 'application/xml'
      ]
    };
  }

  // Get file category based on MIME type
  static getFileCategory(mimeType) {
    if (mimeType.startsWith('image/')) return FileCategory.IMAGE;
    if (mimeType.startsWith('video/')) return FileCategory.VIDEO;
    if (mimeType.startsWith('audio/')) return FileCategory.AUDIO;
    
    switch (mimeType) {
      case 'application/pdf':
      case 'text/plain':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return FileCategory.DOCUMENT;
      
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'text/csv':
        return FileCategory.SPREADSHEET;
      
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return FileCategory.PRESENTATION;
      
      case 'application/zip':
      case 'application/x-rar-compressed':
      case 'application/x-7z-compressed':
        return FileCategory.ARCHIVE;
      
      default:
        return FileCategory.OTHER;
    }
  }

  // Generate unique filename
  static generateFilename(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `${timestamp}_${randomString}${ext}`;
  }

  // Ensure upload directory exists
  static async ensureUploadDir(uploadPath) {
    try {
      await fs.access(uploadPath);
    } catch (error) {
      await fs.mkdir(uploadPath, { recursive: true });
    }
  }

  // Upload file
  static async uploadFile(fileData, uploadedBy, relatedType, relatedId) {
    const {
      originalname,
      mimetype,
      size,
      buffer
    } = fileData;

    try {
      const config = this.getUploadConfig();
      const pool = Database.getPool();

      // Validate file type
      if (!config.allowedTypes.includes(mimetype)) {
        return {
          success: false,
          message: 'File type not allowed'
        };
      }

      // Validate file size
      if (size > config.maxFileSize) {
        return {
          success: false,
          message: `File size exceeds maximum limit of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`
        };
      }

      // Generate unique filename and path
      const filename = this.generateFilename(originalname);
      const category = this.getFileCategory(mimetype);
      const uploadPath = path.join(config.uploadDir, category.toLowerCase());
      const filePath = path.join(uploadPath, filename);
      
      // Ensure upload directory exists
      await this.ensureUploadDir(uploadPath);

      // Save file to disk
      await fs.writeFile(filePath, buffer);

      // Save file metadata to database
      const [result] = await pool.execute(`
        INSERT INTO files (
          original_name, filename, file_path, mime_type, file_size,
          category, related_type, related_id, uploaded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        originalname,
        filename,
        filePath,
        mimetype,
        size,
        category,
        relatedType,
        relatedId,
        uploadedBy
      ]);

      const fileRecord = await this.getFileById(result.insertId);

      console.log(`File uploaded: ${originalname} (ID: ${result.insertId})`);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: fileRecord.data
      };
    } catch (error) {
      console.error('Upload file error:', error);
      return {
        success: false,
        message: 'Failed to upload file'
      };
    }
  }

  // Get file by ID
  static async getFileById(fileId) {
    try {
      const pool = Database.getPool();

      const [rows] = await pool.execute(`
        SELECT 
          f.*,
          u.username as uploaded_by_username,
          u.first_name as uploaded_by_first_name,
          u.last_name as uploaded_by_last_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        WHERE f.file_id = ?
      `, [fileId]);

      if (rows.length === 0) {
        return {
          success: false,
          message: 'File not found'
        };
      }

      const file = rows[0];
      
      // Add download URL
      file.download_url = `/api/files/${fileId}/download`;
      file.formatted_size = this.formatFileSize(file.file_size);

      return {
        success: true,
        data: {
          file
        }
      };
    } catch (error) {
      console.error('Get file by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve file'
      };
    }
  }

  
}

export default FileService;