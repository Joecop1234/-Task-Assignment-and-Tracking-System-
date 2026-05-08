import Database from '../database/database.js';

// Task Status และ Priority enums
export const TaskStatus = {
  TO_DO: 'TO_DO',
  IN_PROGRESS: 'IN_PROGRESS', 
  REVIEW: 'REVIEW',
  DONE: 'DONE'
};

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

class TaskService {
  
  // Get all tasks
  static async getAllTasks(filters = {}) {
    try {
      const pool = Database.getPool();
      let query = `
        SELECT 
          t.*,
          p.project_name,
          u_assigned.username as assigned_to_username,
          u_assigned.first_name as assigned_to_first_name,
          u_assigned.last_name as assigned_to_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.user_id
        LEFT JOIN users u_created ON t.created_by = u_created.user_id
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.project_id) {
        query += ' AND t.project_id = ?';
        params.push(filters.project_id);
      }
      
      if (filters.assigned_to) {
        query += ' AND t.assigned_to = ?';
        params.push(filters.assigned_to);
      }
      
      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }
      
      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }

      if (filters.search) {
        query += ' AND (t.task_title LIKE ? OR t.task_description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' ORDER BY t.created_at DESC';

      const [rows] = await pool.execute(query, params);

      return {
        success: true,
        data: {
          tasks: rows,
          count: rows.length
        }
      };
    } catch (error) {
      console.error('Get all tasks error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get task by ID
  static async getTaskById(taskId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          t.*,
          p.project_name,
          u_assigned.username as assigned_to_username,
          u_assigned.first_name as assigned_to_first_name,
          u_assigned.last_name as assigned_to_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.user_id
        LEFT JOIN users u_created ON t.created_by = u_created.user_id
        WHERE t.task_id = ?
      `, [taskId]);

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Task not found'
        };
      }

      return {
        success: true,
        data: {
          task: rows[0]
        }
      };
    } catch (error) {
      console.error('Get task by ID error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get tasks assigned to user
  static async getUserTasks(userId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          t.*,
          p.project_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u_created ON t.created_by = u_created.user_id
        WHERE t.assigned_to = ?
        ORDER BY 
          CASE t.status 
            WHEN 'TO_DO' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'REVIEW' THEN 3
            WHEN 'DONE' THEN 4
          END,
          t.due_date ASC,
          CASE t.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
          END
      `, [userId]);

      return {
        success: true,
        data: {
          tasks: rows,
          count: rows.length
        }
      };
    } catch (error) {
      console.error('Get user tasks error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get tasks by project
  static async getTasksByProject(projectId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          t.*,
          u_assigned.username as assigned_to_username,
          u_assigned.first_name as assigned_to_first_name,
          u_assigned.last_name as assigned_to_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name
        FROM tasks t
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.user_id
        LEFT JOIN users u_created ON t.created_by = u_created.user_id
        WHERE t.project_id = ?
        ORDER BY 
          CASE t.status 
            WHEN 'TO_DO' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'REVIEW' THEN 3
            WHEN 'DONE' THEN 4
          END,
          CASE t.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
          END,
          t.created_at DESC
      `, [projectId]);

      return {
        success: true,
        data: {
          tasks: rows,
          count: rows.length
        }
      };
    } catch (error) {
      console.error('Get tasks by project error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Create new task
  static async createTask(taskData, createdBy) {
    const {
      task_title,
      task_description,
      project_id,
      assigned_to,
      priority = TaskPriority.MEDIUM,
      due_date,
      estimated_hours
    } = taskData;

    try {
      const pool = Database.getPool();

      // Validate project exists
      const [projectRows] = await pool.execute(
        'SELECT project_id FROM projects WHERE project_id = ?',
        [project_id]
      );

      if (projectRows.length === 0) {
        return {
          success: false,
          message: 'Project not found'
        };
      }

      // Validate assigned user exists (if provided)
      if (assigned_to) {
        const [userRows] = await pool.execute(
          'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
          [assigned_to]
        );

        if (userRows.length === 0) {
          return {
            success: false,
            message: 'Assigned user not found'
          };
        }
      }

      // Insert new task
      const [result] = await pool.execute(`
        INSERT INTO tasks (
          task_title, task_description, project_id, assigned_to,
          created_by, priority, status, due_date, estimated_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task_title,
        task_description,
        project_id,
        assigned_to || null,
        createdBy,
        priority,
        TaskStatus.TO_DO,
        due_date || null,
        estimated_hours || null
      ]);

      // Get the created task
      const createdTask = await this.getTaskById(result.insertId);

      if (createdTask.success) {
        console.log(`✅ Task created: ${task_title} (ID: ${result.insertId})`);
        return {
          success: true,
          message: 'Task created successfully',
          data: createdTask.data
        };
      }

      return createdTask;
    } catch (error) {
      console.error('Create task error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Update task
static async updateTask(taskId, taskData, updatedBy) {
  const {
    task_title,
    task_description,
    project_id,    // เพิ่ม
    assigned_to,   // เพิ่ม  
    priority,
    status,        // เพิ่ม
    due_date,
    estimated_hours,
    actual_hours
  } = taskData;

  try {
    const pool = Database.getPool();

    // Check if task exists
    const existingTask = await this.getTaskById(taskId);
    if (!existingTask.success) {
      return existingTask;
    }

    // Validate assignee if provided
    if (assigned_to) {
      const [userRows] = await pool.execute(
        'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
        [assigned_to]
      );

      if (userRows.length === 0) {
        return {
          success: false,
          message: 'Assigned user not found'
        };
      }
    }

    // Update task - เพิ่ม fields ใหม่
    await pool.execute(`
      UPDATE tasks 
      SET task_title = ?, task_description = ?, project_id = ?,
          assigned_to = ?, priority = ?, status = ?, 
          due_date = ?, estimated_hours = ?, actual_hours = ?, 
          updated_at = NOW()
      WHERE task_id = ?
    `, [
      task_title || existingTask.data.task.task_title,
      task_description || existingTask.data.task.task_description,
      project_id || existingTask.data.task.project_id,
      assigned_to !== undefined ? assigned_to : existingTask.data.task.assigned_to,
      priority || existingTask.data.task.priority,
      status || existingTask.data.task.status,
      due_date || existingTask.data.task.due_date,
      estimated_hours || existingTask.data.task.estimated_hours,
      actual_hours || existingTask.data.task.actual_hours,
      taskId
    ]);

    console.log(`✅ Task updated: ${taskId}`);

    // Return updated task
    return await this.getTaskById(taskId);
  } catch (error) {
    console.error('Update task error:', error);
    return {
      success: false,
      message: 'Internal server error'
    };
  }
}

  // Update task status
  static async updateTaskStatus(taskId, status, updatedBy) {
    try {
      const pool = Database.getPool();

      // Validate status
      if (!Object.values(TaskStatus).includes(status)) {
        return {
          success: false,
          message: 'Invalid task status'
        };
      }

      // Check if task exists
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask.success) {
        return existingTask;
      }

      const oldStatus = existingTask.data.task.status;

      // Update task status
      await pool.execute(`
        UPDATE tasks 
        SET status = ?, updated_at = NOW()
        WHERE task_id = ?
      `, [status, taskId]);

      // Log task history
      await this.logTaskHistory(
        taskId, 
        updatedBy, 
        'STATUS_CHANGED', 
        `Status changed from ${oldStatus} to ${status}`
      );

      console.log(`✅ Task status updated: ${taskId} -> ${status}`);

      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Update task status error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Assign task to user
  static async assignTask(taskId, assigneeId, assignedBy) {
    try {
      const pool = Database.getPool();

      // Check if task exists
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask.success) {
        return existingTask;
      }

      // Validate assignee exists
      const [userRows] = await pool.execute(
        'SELECT user_id, first_name, last_name FROM users WHERE user_id = ? AND is_active = TRUE',
        [assigneeId]
      );

      if (userRows.length === 0) {
        return {
          success: false,
          message: 'Assignee not found'
        };
      }

      const assignee = userRows[0];

      // Update task assignment
      await pool.execute(`
        UPDATE tasks 
        SET assigned_to = ?, updated_at = NOW()
        WHERE task_id = ?
      `, [assigneeId, taskId]);

      // Log task history
      await this.logTaskHistory(
        taskId, 
        assignedBy, 
        'ASSIGNED', 
        `Task assigned to ${assignee.first_name} ${assignee.last_name}`
      );

      console.log(` Task assigned: ${taskId} -> User ${assigneeId}`);

      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Assign task error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Delete task
  static async deleteTask(taskId, deletedBy) {
    try {
      const pool = Database.getPool();

      // Check if task exists
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask.success) {
        return existingTask;
      }

      // Delete task (hard delete - in production you might want soft delete)
      await pool.execute('DELETE FROM tasks WHERE task_id = ?', [taskId]);

      console.log(` Task deleted: ${taskId}`);

      return {
        success: true,
        message: 'Task deleted successfully'
      };
    } catch (error) {
      console.error('Delete task error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get overdue tasks
  static async getOverdueTasks() {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          t.*,
          p.project_name,
          u_assigned.username as assigned_to_username,
          u_assigned.first_name as assigned_to_first_name,
          u_assigned.last_name as assigned_to_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.user_id
        LEFT JOIN users u_created ON t.created_by = u_created.user_id
        WHERE t.due_date < CURDATE() 
        AND t.status != 'DONE'
        ORDER BY t.due_date ASC
      `);

      return {
        success: true,
        data: {
          tasks: rows,
          count: rows.length
        }
      };
    } catch (error) {
      console.error('Get overdue tasks error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get task statistics
  static async getTaskStats(filters = {}) {
    try {
      const pool = Database.getPool();
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.project_id) {
        whereClause += ' AND project_id = ?';
        params.push(filters.project_id);
      }

      if (filters.assigned_to) {
        whereClause += ' AND assigned_to = ?';
        params.push(filters.assigned_to);
      }

      // Get status counts
      const [statusRows] = await pool.execute(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        ${whereClause}
        GROUP BY status
      `, params);

      // Get priority counts
      const [priorityRows] = await pool.execute(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        ${whereClause}
        GROUP BY priority
      `, params);

      // Get total count
      const [totalRows] = await pool.execute(`
        SELECT COUNT(*) as total FROM tasks ${whereClause}
      `, params);

      // Get overdue count
      const [overdueRows] = await pool.execute(`
        SELECT COUNT(*) as overdue 
        FROM tasks 
        ${whereClause} AND due_date < CURDATE() AND status != 'DONE'
      `, params);

      const stats = {
        total: totalRows[0].total,
        overdue: overdueRows[0].overdue,
        by_status: statusRows.reduce((acc, row) => {
          acc[row.status.toLowerCase()] = row.count;
          return acc;
        }, {}),
        by_priority: priorityRows.reduce((acc, row) => {
          acc[row.priority.toLowerCase()] = row.count;
          return acc;
        }, {})
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Get task stats error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Log task history
  static async logTaskHistory(taskId, changedBy, action, description) {
    try {
      const pool = Database.getPool();
      await pool.execute(`
        INSERT INTO task_history (task_id, changed_by, action, description, changed_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [taskId, changedBy, action, description]);
    } catch (error) {
      console.error('Log task history error:', error);
      // Don't throw error for history logging failure
    }
  }

  // Get task history
  static async getTaskHistory(taskId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          th.*,
          u.username,
          u.first_name,
          u.last_name
        FROM task_history th
        LEFT JOIN users u ON th.changed_by = u.user_id
        WHERE th.task_id = ?
        ORDER BY th.changed_at DESC
      `, [taskId]);

      return {
        success: true,
        data: {
          history: rows,
          count: rows.length
        }
      };
    } catch (error) {
      console.error('Get task history error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}

export default TaskService;