// NotificationController.js - เพิ่ม parameter validation และ debug
import express from 'express';
import NotificationService, { NotificationType, NotificationPriority } from '../services/NotificationService.js';
import { authenticateToken, requireRole } from './authController.js';

const router = express.Router();

// User roles enum
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

// GET USER NOTIFICATIONS API - เพิ่ม validation
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      is_read, 
      type, 
      priority, 
      date_from, 
      date_to, 
      limit = '50'  // เป็น string เสมอจาก query params
    } = req.query;

    console.log('Debug - Controller received query params:', req.query);
    console.log('Debug - User from token:', req.user);

    // Validate user ID
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated properly'
      });
    }

    const filters = {};
    
    // Validate and convert parameters
    if (is_read !== undefined) {
      filters.is_read = is_read === 'true';
    }
    
    if (type) {
      filters.type = type;
    }
    
    if (priority) {
      filters.priority = priority;
    }
    
    if (date_from) {
      filters.date_from = date_from;
    }
    
    if (date_to) {
      filters.date_to = date_to;
    }
    
    // Handle limit carefully
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 1000) {
        filters.limit = limitNum;
      } else {
        filters.limit = 50; // default
      }
    }

    console.log('Debug - Processed filters:', filters);

    const result = await NotificationService.getUserNotifications(req.user.userId, filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get notifications controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.user_id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('Debug - Unread count API called by user:', userId);

    // Get unread count
    const result = await NotificationService.getUserNotifications(userId, { 
      is_read: false,
      limit: 999  // Get all unread to count
    });

    if (result.success) {
      const count = result.data?.notifications?.length || 0;
      
      console.log('Debug - Unread count:', count);
      
      res.json({
        success: true,
        data: { count }
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;