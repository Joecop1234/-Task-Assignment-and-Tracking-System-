// NotificationService.js - Workaround version
import Database from '../database/database.js';

// Notification Type enum
export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_STATUS_UPDATED: 'TASK_STATUS_UPDATED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  TASK_OVERDUE: 'TASK_OVERDUE',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_STATUS_UPDATED: 'PROJECT_STATUS_UPDATED',
  MENTION: 'MENTION',
  COMMENT_ADDED: 'COMMENT_ADDED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
};

// Notification Priority enum
export const NotificationPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

class NotificationService {

 static async getUserNotifications(userId, filters = {}) {
    try {
      const pool = Database.getPool();
      
      console.log('Debug - getUserNotifications called with:', { userId, filters });

      // ตรวจสอบ userId
      if (!userId || isNaN(userId)) {
        throw new Error('Invalid userId provided');
      }

      let query = `
        SELECT 
          n.*,
          u.username as created_by_username,
          u.first_name as created_by_first_name,
          u.last_name as created_by_last_name
        FROM notifications n
        LEFT JOIN users u ON n.created_by = u.user_id
        WHERE n.user_id = ?
      `;
      
      const params = [parseInt(userId)];

      // Apply filters
      if (filters.is_read !== undefined) {
        query += ' AND n.is_read = ?';
        params.push(Boolean(filters.is_read));
      }

      if (filters.type) {
        query += ' AND n.type = ?';
        params.push(filters.type);
      }

      if (filters.priority) {
        query += ' AND n.priority = ?';
        params.push(filters.priority);
      }

      if (filters.date_from) {
        query += ' AND n.created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND n.created_at <= ?';
        params.push(filters.date_to);
      }

      query += ' ORDER BY n.created_at DESC';

      console.log('Debug - Query without LIMIT:', query);
      console.log('Debug - Parameters:', params);

      // Execute query without LIMIT first
      const [rows] = await pool.execute(query, params);

      console.log('Debug - Query executed successfully, rows:', rows.length);

      // Apply LIMIT in JavaScript instead of SQL
      let finalRows = rows;
      if (filters.limit && !isNaN(filters.limit)) {
        const limitValue = parseInt(filters.limit);
        if (limitValue > 0) {
          finalRows = rows.slice(0, limitValue);
          console.log('Debug - Applied JavaScript LIMIT:', limitValue, 'result:', finalRows.length);
        }
      }

      return {
        success: true,
        data: {
          notifications: finalRows,
          count: finalRows.length
        }
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      console.error('Error details:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      return {
        success: false,
        message: 'Failed to retrieve notifications'
      };
    }
  }

  // CREATE NOTIFICATION
  static async createNotification(notificationData) {
    const {
      user_id,
      type,
      title,
      message,
      related_id,
      related_type,
      priority = NotificationPriority.MEDIUM,
      send_email = true,
      created_by
    } = notificationData;

    try {
      const pool = Database.getPool();

      // Insert notification
      const [result] = await pool.execute(`
        INSERT INTO notifications (
          user_id, type, title, message, related_id, related_type,
          priority, is_read, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        user_id,
        type,
        title,
        message,
        related_id || null,
        related_type || null,
        priority,
        false,
        created_by || null
      ]);

      // Get user email for sending email notification
      if (send_email) {
        const [userRows] = await pool.execute(
          'SELECT email, first_name, last_name FROM users WHERE user_id = ?',
          [user_id]
        );
      }

      console.log(`✅ Notification created: ${title} for user ${user_id}`);

      return {
        success: true,
        message: 'Notification created successfully',
        data: { notification_id: result.insertId }
      };
    } catch (error) {
      console.error('Create notification error:', error);
      return {
        success: false,
        message: 'Failed to create notification'
      };
    }
  }

 
}

export default NotificationService;
