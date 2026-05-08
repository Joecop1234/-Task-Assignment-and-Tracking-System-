import express from 'express';
import  TaskService  from '../services/TaskService.js';
import { authenticateToken, requireRole } from './authController.js';
import NotificationService, { NotificationType, NotificationPriority } from '../services/NotificationService.js';
const router = express.Router();




// User roles enum (imported from authController)
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const TaskStatus = {
  TO_DO: 'TO_DO',
  IN_PROGRESS: 'IN_PROGRESS', 
  REVIEW: 'REVIEW',
  DONE: 'DONE'
};

// GET ALL TASKS API
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      project_id, 
      assigned_to, 
      status, 
      priority, 
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Build filters object
    const filters = {};
    if (project_id) filters.project_id = parseInt(project_id);
    if (assigned_to) filters.assigned_to = parseInt(assigned_to);
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (search) filters.search = search;

    const result = await TaskService.getAllTasks(filters);

    if (result.success) {
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTasks = result.data.tasks.slice(startIndex, endIndex);

      res.json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: {
          tasks: paginatedTasks,
          total: result.data.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.data.count / limit)
        }
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET TASK BY ID API
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const result = await TaskService.getTaskById(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'Task found',
        data: result.data
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET MY TASKS API
router.get('/my/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await TaskService.getUserTasks(req.user.userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User tasks retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET TASKS BY PROJECT API
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const result = await TaskService.getTasksByProject(parseInt(projectId));

    if (result.success) {
      res.json({
        success: true,
        message: 'Project tasks retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get tasks by project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET OVERDUE TASKS API
router.get('/overdue/all', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const result = await TaskService.getOverdueTasks();

    if (result.success) {
      res.json({
        success: true,
        message: 'Overdue tasks retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET TASK STATISTICS API
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { project_id, assigned_to } = req.query;
    
    const filters = {};
    if (project_id) filters.project_id = parseInt(project_id);
    if (assigned_to) filters.assigned_to = parseInt(assigned_to);

    const result = await TaskService.getTaskStats(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Task statistics retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


router.post('/', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    // ✅ เพิ่มการตรวจสอบ req.user และ fallback
    console.log('🔍 Debug req.user:', req.user);
    
    const userId = req.user?.userId || req.user?.user_id || req.user?.id;
    
    if (!userId) {
      console.error('❌ No userId found in req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication failed - no user ID found'
      });
    }
    
    console.log('✅ Using userId:', userId);

    const {
      task_title,
      task_description,
      project_id,
      assigned_to,
      priority,
      due_date,
      estimated_hours,
      notify_team = false // เพิ่ม option ในการแจ้งเตือนทีม
    } = req.body;

    // Basic validation
    if (!task_title || !project_id) {
      return res.status(400).json({
        success: false,
        message: 'Task title and project ID are required'
      });
    }

    if (task_title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Task title must be at least 3 characters'
      });
    }

    // Validate priority if provided
    if (priority && !Object.values(TaskPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value'
      });
    }

    // Validate due date if provided
    if (due_date) {
      const dueDate = new Date(due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Due date cannot be in the past'
        });
      }
    }

    // Validate estimated hours if provided
    if (estimated_hours && (isNaN(estimated_hours) || estimated_hours <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Estimated hours must be a positive number'
      });
    }

    const taskData = {
      task_title,
      task_description,
      project_id: parseInt(project_id),
      assigned_to: assigned_to ? parseInt(assigned_to) : null,
      priority: priority || TaskPriority.MEDIUM,
      due_date,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null
    };
    
    // ✅ ใช้ userId ที่ได้จากการตรวจสอบ
    const result = await TaskService.createTask(taskData, userId);

if (result.success) {
  try {
    // แก้ไขตรงนี้ - ใช้ result.data.task แทน result.data
    let taskForNotification = result.data.task || result.data;
    
    await sendTaskNotifications(taskForNotification, userId, notify_team);
    console.log('Task created and notifications sent');
  } catch (notificationError) {
    console.error('Notification error:', notificationError);
  }

  res.status(201).json({
    ...result,
    message: 'Task created successfully and notifications sent'
  });
} else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
async function sendTaskNotifications(taskData, createdBy, notifyTeam = false) {
  try {
    const taskId = taskData.task_id;
    const taskTitle = taskData.task_title;
    const projectId = taskData.project_id;
    const assignedTo = taskData.assigned_to;
    const priority = taskData.priority;
    
    if (!taskId) {
      console.error('No task ID found');
      return;
    }
    
    console.log('Sending notifications for task ID:', taskId);

    // 1. แจ้งเตือนผู้ที่ได้รับมอบหมาย - ใช้ createNotification แทน
    if (assignedTo && assignedTo !== createdBy) {
      try {
        await NotificationService.createNotification({
          user_id: assignedTo,
          type: 'TASK_ASSIGNED',
          title: 'งานใหม่ที่ได้รับมอบหมาย',
          message: `คุณได้รับมอบหมายงาน: "${taskTitle}"`,
          related_id: taskId,
          related_type: 'task',
          priority: 'HIGH',
          send_email: true,
          created_by: createdBy
        });
        console.log('Assignment notification sent');
      } catch (error) {
        console.error('Assignment notification error:', error);
      }
    }

    // 2. แจ้งเตือนสำหรับงานสำคัญ
    if (['HIGH', 'URGENT'].includes(priority) && assignedTo) {
      try {
        await NotificationService.createNotification({
          user_id: assignedTo,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: `งานสำคัญ: ${priority}`,
          message: `คุณได้รับมอบหมายงานที่มีความสำคัญ ${priority}: "${taskTitle}"`,
          related_id: taskId,
          related_type: 'task',
          priority: 'URGENT',
          send_email: true,
          created_by: createdBy
        });
        console.log('Urgent notification sent');
      } catch (error) {
        console.error('Urgent notification error:', error);
      }
    }

    // 3. แจ้งเตือนหัวหน้าโครงการ
    if (projectId) {
      try {
        const Database = (await import('../database/database.js')).default;
        const pool = Database.getPool();
        
        const [projectRows] = await pool.execute(
          'SELECT leader_id, project_name FROM projects WHERE project_id = ?',
          [parseInt(projectId)]
        );
        
        if (projectRows.length > 0 && projectRows[0].leader_id) {
          const leaderId = projectRows[0].leader_id;
          const projectName = projectRows[0].project_name;
          
          if (leaderId !== createdBy && leaderId !== assignedTo) {
            await NotificationService.createNotification({
              user_id: leaderId,
              type: 'PROJECT_CREATED',
              title: 'งานใหม่ในโครงการของคุณ',
              message: `งานใหม่ "${taskTitle}" ถูกสร้างในโครงการ ${projectName}`,
              related_id: taskId,
              related_type: 'task',
              priority: 'MEDIUM',
              send_email: false,
              created_by: createdBy
            });
            console.log('Project leader notification sent');
          }
        }
      } catch (error) {
        console.error('Project leader notification error:', error);
      }
    }

    console.log('All notifications completed');
  } catch (error) {
    console.error('General notification error:', error);
  }
}


// UPDATE TASK API
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_title,
      task_description,
      project_id,    
      assigned_to,  
      priority,
      status,       
      due_date,
      estimated_hours,
      actual_hours
    } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // เพิ่ม status validation
    if (status && !Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Validate priority if provided
    if (priority && !Object.values(TaskPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value'
      });
    }

    // Validate due date if provided
    if (due_date) {
      const dueDate = new Date(due_date);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format'
        });
      }
    }

    // Validate hours if provided
    if (estimated_hours && (isNaN(estimated_hours) || estimated_hours <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Estimated hours must be a positive number'
      });
    }

    if (actual_hours && (isNaN(actual_hours) || actual_hours < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Actual hours must be a non-negative number'
      });
    }

    const taskData = {
      task_title,
      task_description,
      project_id: project_id ? parseInt(project_id) : undefined,
      assigned_to: assigned_to ? parseInt(assigned_to) : undefined,
      priority,
      status,        // เพิ่ม
      due_date,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : undefined,
      actual_hours: actual_hours ? parseFloat(actual_hours) : undefined
    };

    // Remove undefined values
    Object.keys(taskData).forEach(key => 
      taskData[key] === undefined && delete taskData[key]
    );

    const result = await TaskService.updateTask(parseInt(id), taskData, req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// UPDATE TASK STATUS API
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await TaskService.updateTaskStatus(parseInt(id), status, req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ASSIGN TASK API
router.put('/:id/assign', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    if (!assigned_to || isNaN(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: 'Valid assignee ID is required'
      });
    }

    const result = await TaskService.assignTask(
      parseInt(id), 
      parseInt(assigned_to), 
      req.user.userId
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE TASK API
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const result = await TaskService.deleteTask(parseInt(id), req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const result = await TaskService.getTaskHistory(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'Task history retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});





export default router;