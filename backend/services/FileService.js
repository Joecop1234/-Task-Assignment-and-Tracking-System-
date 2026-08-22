import Database from '../database/database.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

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

// AES-256-CBC helpers
const ALGORITHM = 'aes-256-cbc';
const KEY_HEX   = process.env.FILE_ENCRYPTION_KEY; // 64 hex chars = 32 bytes

function getEncryptionKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('FILE_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

function encryptBuffer(plainBuffer) {
  const key = getEncryptionKey();
  const iv  = crypto.randomBytes(16);                          // fresh IV every upload
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  // Prepend IV (16 bytes) to ciphertext so we can recover it on download
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(encryptedBuffer) {
  const key = getEncryptionKey();
  const iv        = encryptedBuffer.subarray(0, 16);           // first 16 bytes = IV
  const ciphertext = encryptedBuffer.subarray(16);
  const decipher  = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

class FileService {

  // ─── Config ──────────────────────────────────────────────────────────────

  static getUploadConfig() {
    const uploadDir  = process.env.UPLOAD_DIR  || 'uploads';
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10 MB

    return {
      uploadDir,
      maxFileSize,
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'application/json', 'application/xml'
      ]
    };
  }

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

  static generateFilename(originalName) {
    const timestamp    = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext          = path.extname(originalName);
    return `${timestamp}_${randomString}${ext}.enc`; // .enc suffix marks encrypted files
  }

  static async ensureUploadDir(uploadPath) {
    try {
      await fs.access(uploadPath);
    } catch {
      await fs.mkdir(uploadPath, { recursive: true });
    }
  }

  // ─── Upload (encrypt before write)

  static async uploadFile(fileData, uploadedBy, relatedType, relatedId) {
    const { originalname, mimetype, size, buffer } = fileData;

    try {
      const config = this.getUploadConfig();
      const pool   = Database.getPool();

      if (!config.allowedTypes.includes(mimetype)) {
        return { success: false, message: 'File type not allowed' };
      }

      if (size > config.maxFileSize) {
        return {
          success: false,
          message: `File size exceeds maximum limit of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`
        };
      }

      // Dangerous extension guard
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      if (dangerousExtensions.includes(path.extname(originalname).toLowerCase())) {
        return { success: false, message: 'File extension is not allowed for security reasons' };
      }

      const filename   = this.generateFilename(originalname);
      const category   = this.getFileCategory(mimetype);
      const uploadPath = path.join(config.uploadDir, category.toLowerCase());
      const filePath   = path.join(uploadPath, filename);

      await this.ensureUploadDir(uploadPath);

      // Encrypt with AES-256-CBC before writing to disk
      const encryptedBuffer = encryptBuffer(buffer);
      await fs.writeFile(filePath, encryptedBuffer);

      const [result] = await pool.execute(`
        INSERT INTO files (
          original_name, filename, file_path, mime_type, file_size,
          category, related_type, related_id, uploaded_by, is_encrypted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      `, [originalname, filename, filePath, mimetype, size, category, relatedType, relatedId, uploadedBy]);

      const fileRecord = await this.getFileById(result.insertId);

      console.log(`File uploaded & encrypted: ${originalname} (ID: ${result.insertId})`);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: fileRecord.data
      };
    } catch (error) {
      console.error('Upload file error:', error);
      return { success: false, message: 'Failed to upload file' };
    }
  }

  // ─── Download (decrypt before sending)

  static async downloadFile(fileId) {
    try {
      const fileResult = await this.getFileById(fileId);
      if (!fileResult.success) return fileResult;

      const file = fileResult.data.file;

      try {
        await fs.access(file.file_path);
      } catch {
        return { success: false, message: 'File not found on disk' };
      }

      const rawBuffer = await fs.readFile(file.file_path);

      //  Decrypt if the file was stored encrypted
      const fileBuffer = file.is_encrypted ? decryptBuffer(rawBuffer) : rawBuffer;

      return {
        success: true,
        data: {
          buffer:   fileBuffer,
          filename: file.original_name,
          mimetype: file.mime_type,
          size:     file.file_size
        }
      };
    } catch (error) {
      console.error('Download file error:', error);
      return { success: false, message: 'Failed to download file' };
    }
  }

  // Get file by ID

  static async getFileById(fileId) {
    try {
      const pool = Database.getPool();

      const [rows] = await pool.execute(`
        SELECT 
          f.*,
          u.username       as uploaded_by_username,
          u.first_name     as uploaded_by_first_name,
          u.last_name      as uploaded_by_last_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        WHERE f.file_id = ?
      `, [fileId]);

      if (rows.length === 0) {
        return { success: false, message: 'File not found' };
      }

      const file = rows[0];
      file.download_url    = `/api/files/${fileId}/download`;
      file.formatted_size  = this.formatFileSize(file.file_size);

      return { success: true, data: { file } };
    } catch (error) {
      console.error('Get file by ID error:', error);
      return { success: false, message: 'Failed to retrieve file' };
    }
  }

  // Get files by related item 
  static async getFilesByRelated(relatedType, relatedId) {
    try {
      const pool = Database.getPool();

      const [rows] = await pool.execute(`
        SELECT 
          f.*,
          u.username   as uploaded_by_username,
          u.first_name as uploaded_by_first_name,
          u.last_name  as uploaded_by_last_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        WHERE f.related_type = ? AND f.related_id = ?
        ORDER BY f.created_at DESC
      `, [relatedType, relatedId]);

      const files = rows.map(file => ({
        ...file,
        download_url:   `/api/files/${file.file_id}/download`,
        formatted_size: this.formatFileSize(file.file_size)
      }));

      return { success: true, data: { files, count: files.length } };
    } catch (error) {
      console.error('Get files by related error:', error);
      return { success: false, message: 'Failed to retrieve files' };
    }
  }

  // Get user files 

  static async getUserFiles(userId, filters = {}) {
    try {
      const pool = Database.getPool();

      let query = `
        SELECT 
          f.*,
          u.username   as uploaded_by_username,
          u.first_name as uploaded_by_first_name,
          u.last_name  as uploaded_by_last_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        WHERE f.uploaded_by = ?
      `;
      const params = [userId];

      if (filters.category)     { query += ' AND f.category = ?';      params.push(filters.category); }
      if (filters.related_type) { query += ' AND f.related_type = ?';  params.push(filters.related_type); }
      if (filters.date_from)    { query += ' AND f.created_at >= ?';   params.push(filters.date_from); }
      if (filters.date_to)      { query += ' AND f.created_at <= ?';   params.push(filters.date_to); }
      if (filters.search)       { query += ' AND f.original_name LIKE ?'; params.push(`%${filters.search}%`); }

      query += ' ORDER BY f.created_at DESC';
      if (filters.limit) { query += ' LIMIT ?'; params.push(parseInt(filters.limit)); }

      const [rows] = await pool.execute(query, params);

      const files = rows.map(file => ({
        ...file,
        download_url:   `/api/files/${file.file_id}/download`,
        formatted_size: this.formatFileSize(file.file_size)
      }));

      return { success: true, data: { files, count: files.length } };
    } catch (error) {
      console.error('Get user files error:', error);
      return { success: false, message: 'Failed to retrieve user files' };
    }
  }

  // Delete file 

  static async deleteFile(fileId, deletedBy) {
    try {
      const pool       = Database.getPool();
      const fileResult = await this.getFileById(fileId);
      if (!fileResult.success) return fileResult;

      const file = fileResult.data.file;

      if (file.uploaded_by !== deletedBy) {
        const [userRows] = await pool.execute(
          'SELECT role FROM users WHERE user_id = ?', [deletedBy]
        );
        if (userRows.length === 0 || userRows[0].role !== 'ADMIN') {
          return { success: false, message: 'Insufficient permissions to delete file' };
        }
      }

      try { await fs.unlink(file.file_path); } catch (e) {
        console.warn('Failed to delete file from disk:', e);
      }

      await pool.execute('DELETE FROM files WHERE file_id = ?', [fileId]);
      console.log(`File deleted: ${file.original_name} (ID: ${fileId})`);

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, message: 'Failed to delete file' };
    }
  }

  //  Update file metadata
  static async updateFileMetadata(fileId, metadata, updatedBy) {
    try {
      const pool       = Database.getPool();
      const fileResult = await this.getFileById(fileId);
      if (!fileResult.success) return fileResult;

      const file = fileResult.data.file;

      if (file.uploaded_by !== updatedBy) {
        const [userRows] = await pool.execute(
          'SELECT role FROM users WHERE user_id = ?', [updatedBy]
        );
        if (userRows.length === 0 || userRows[0].role !== 'ADMIN') {
          return { success: false, message: 'Insufficient permissions to update file' };
        }
      }

      const allowedFields = ['original_name', 'description'];
      const updates = [];
      const params  = [];

      Object.keys(metadata).forEach(key => {
        if (allowedFields.includes(key) && metadata[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(metadata[key]);
        }
      });

      if (updates.length === 0) {
        return { success: false, message: 'No valid fields to update' };
      }

      params.push(fileId);
      await pool.execute(
        `UPDATE files SET ${updates.join(', ')}, updated_at = NOW() WHERE file_id = ?`,
        params
      );

      return await this.getFileById(fileId);
    } catch (error) {
      console.error('Update file metadata error:', error);
      return { success: false, message: 'Failed to update file metadata' };
    }
  }

  //  File stats 

  static async getFileStats(filters = {}) {
    try {
      const pool = Database.getPool();
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.uploaded_by)  { whereClause += ' AND uploaded_by = ?';   params.push(filters.uploaded_by); }
      if (filters.related_type) { whereClause += ' AND related_type = ?';  params.push(filters.related_type); }
      if (filters.date_from)    { whereClause += ' AND created_at >= ?';   params.push(filters.date_from); }
      if (filters.date_to)      { whereClause += ' AND created_at <= ?';   params.push(filters.date_to); }

      const [overallStats]  = await pool.execute(`SELECT COUNT(*) as total_files, SUM(file_size) as total_size, AVG(file_size) as avg_size, COUNT(DISTINCT uploaded_by) as unique_uploaders FROM files ${whereClause}`, params);
      const [categoryStats] = await pool.execute(`SELECT category, COUNT(*) as count, SUM(file_size) as total_size FROM files ${whereClause} GROUP BY category ORDER BY count DESC`, params);
      const [typeStats]     = await pool.execute(`SELECT mime_type, COUNT(*) as count, SUM(file_size) as total_size FROM files ${whereClause} GROUP BY mime_type ORDER BY count DESC LIMIT 10`, params);

      return {
        success: true,
        data: {
          overall: {
            ...overallStats[0],
            formatted_total_size: this.formatFileSize(overallStats[0].total_size || 0),
            formatted_avg_size:   this.formatFileSize(overallStats[0].avg_size   || 0)
          },
          by_category: categoryStats.map(s => ({ ...s, formatted_size: this.formatFileSize(s.total_size) })),
          by_type:     typeStats.map(s => ({ ...s, formatted_size: this.formatFileSize(s.total_size) }))
        }
      };
    } catch (error) {
      console.error('Get file stats error:', error);
      return { success: false, message: 'Failed to get file statistics' };
    }
  }

  //Clean orphaned files 

  static async cleanOrphanedFiles() {
    try {
      const pool = Database.getPool();

      const [orphanedFiles] = await pool.execute(`
        SELECT f.file_id, f.file_path, f.original_name
        FROM files f
        LEFT JOIN tasks    t ON f.related_type = 'task'    AND f.related_id = t.task_id
        LEFT JOIN projects p ON f.related_type = 'project' AND f.related_id = p.project_id
        WHERE (f.related_type = 'task'    AND t.task_id    IS NULL)
           OR (f.related_type = 'project' AND p.project_id IS NULL)
      `);

      let deletedCount = 0;
      for (const file of orphanedFiles) {
        try {
          await fs.unlink(file.file_path);
          await pool.execute('DELETE FROM files WHERE file_id = ?', [file.file_id]);
          deletedCount++;
        } catch (e) {
          console.warn(`Failed to clean file ${file.file_id}:`, e);
        }
      }

      return { success: true, data: { cleaned_count: deletedCount, total_orphaned: orphanedFiles.length } };
    } catch (error) {
      console.error('Clean orphaned files error:', error);
      return { success: false, message: 'Failed to clean orphaned files' };
    }
  }

  // ─── User storage usage ───────────────────────────────────────────────────

  static async getUserStorageUsage(userId) {
    try {
      const pool = Database.getPool();
      const [result] = await pool.execute(`
        SELECT COUNT(*) as file_count, SUM(file_size) as total_size, MAX(created_at) as last_upload
        FROM files WHERE uploaded_by = ?
      `, [userId]);

      const usage = result[0];
      return {
        success: true,
        data: {
          file_count:     usage.file_count,
          total_size:     usage.total_size || 0,
          formatted_size: this.formatFileSize(usage.total_size || 0),
          last_upload:    usage.last_upload
        }
      };
    } catch (error) {
      console.error('Get user storage usage error:', error);
      return { success: false, message: 'Failed to get storage usage' };
    }
  }

  // Helpers

  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k     = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i     = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getPreviewUrl(fileId, file) {
    if (file.category === FileCategory.IMAGE) return `/api/files/${fileId}/preview`;
    return null;
  }

  static validateUpload(file) {
    const config = this.getUploadConfig();
    const errors = [];
    if (!file)                                  { errors.push('No file provided'); return { isValid: false, errors }; }
    if (!config.allowedTypes.includes(file.mimetype))     errors.push(`File type '${file.mimetype}' is not allowed`);
    if (file.size > config.maxFileSize)                   errors.push(`File size exceeds maximum limit of ${this.formatFileSize(config.maxFileSize)}`);
    if (file.originalname.length > 255)                   errors.push('Filename is too long (maximum 255 characters)');
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (dangerousExtensions.includes(path.extname(file.originalname).toLowerCase()))
      errors.push('File extension is not allowed for security reasons');
    return { isValid: errors.length === 0, errors };
  }
}

export default FileService;
