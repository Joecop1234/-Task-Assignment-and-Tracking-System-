import Database from '../database/database.js';

// Project Status enum
export const ProjectStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

class ProjectService {
  
  // Get all projects
  static async getAllProjects(filters = {}) {
    try {
      const pool = Database.getPool();
      let query = `
        SELECT 
          p.*,
          u_leader.username as leader_username,
          u_leader.first_name as leader_first_name,
          u_leader.last_name as leader_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name,
          COUNT(t.task_id) as total_tasks,
          COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN t.due_date < CURDATE() AND t.status != 'DONE' THEN 1 END) as overdue_tasks
        FROM projects p
        LEFT JOIN users u_leader ON p.leader_id = u_leader.user_id
        LEFT JOIN users u_created ON p.created_by = u_created.user_id
        LEFT JOIN tasks t ON p.project_id = t.project_id
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }
      
      if (filters.leader_id) {
        query += ' AND p.leader_id = ?';
        params.push(filters.leader_id);
      }
      
      if (filters.created_by) {
        query += ' AND p.created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.search) {
        query += ' AND (p.project_name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.date_from) {
        query += ' AND p.start_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND p.end_date <= ?';
        params.push(filters.date_to);
      }

      query += ` 
        GROUP BY p.project_id 
        ORDER BY p.created_at DESC
      `;

      const [rows] = await pool.execute(query, params);

      // Calculate progress percentage for each project
      const projectsWithProgress = rows.map(project => ({
        ...project,
        progress_percentage: project.total_tasks > 0 
          ? Math.round((project.completed_tasks / project.total_tasks) * 100)
          : 0,
        is_overdue: project.end_date && new Date(project.end_date) < new Date() && project.status !== 'COMPLETED'
      }));

      return {
        success: true,
        data: {
          projects: projectsWithProgress,
          count: projectsWithProgress.length
        }
      };
    } catch (error) {
      console.error('Get all projects error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get project by ID
  static async getProjectById(projectId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          p.*,
          u_leader.username as leader_username,
          u_leader.first_name as leader_first_name,
          u_leader.last_name as leader_last_name,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name,
          COUNT(t.task_id) as total_tasks,
          COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN t.status = 'TO_DO' THEN 1 END) as todo_tasks,
          COUNT(CASE WHEN t.status = 'REVIEW' THEN 1 END) as review_tasks,
          COUNT(CASE WHEN t.due_date < CURDATE() AND t.status != 'DONE' THEN 1 END) as overdue_tasks,
          SUM(t.estimated_hours) as total_estimated_hours,
          SUM(t.actual_hours) as total_actual_hours
        FROM projects p
        LEFT JOIN users u_leader ON p.leader_id = u_leader.user_id
        LEFT JOIN users u_created ON p.created_by = u_created.user_id
        LEFT JOIN tasks t ON p.project_id = t.project_id
        WHERE p.project_id = ?
        GROUP BY p.project_id
      `, [projectId]);

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Project not found'
        };
      }

      const project = rows[0];
      
      // Calculate additional metrics
      project.progress_percentage = project.total_tasks > 0 
        ? Math.round((project.completed_tasks / project.total_tasks) * 100)
        : 0;
      
      project.is_overdue = project.end_date && new Date(project.end_date) < new Date() && project.status !== 'COMPLETED';
      
      project.efficiency = project.total_estimated_hours > 0 && project.total_actual_hours > 0
        ? Math.round((project.total_estimated_hours / project.total_actual_hours) * 100)
        : null;

      return {
        success: true,
        data: {
          project
        }
      };
    } catch (error) {
      console.error('Get project by ID error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Get projects by leader
  static async getProjectsByLeader(leaderId) {
    try {
      const pool = Database.getPool();
      const [rows] = await pool.execute(`
        SELECT 
          p.*,
          u_created.username as created_by_username,
          u_created.first_name as created_by_first_name,
          u_created.last_name as created_by_last_name,
          COUNT(t.task_id) as total_tasks,
          COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks
        FROM projects p
        LEFT JOIN users u_created ON p.created_by = u_created.user_id
        LEFT JOIN tasks t ON p.project_id = t.project_id
        WHERE p.leader_id = ?
        GROUP BY p.project_id
        ORDER BY p.created_at DESC
      `, [leaderId]);

      const projectsWithProgress = rows.map(project => ({
        ...project,
        progress_percentage: project.total_tasks > 0 
          ? Math.round((project.completed_tasks / project.total_tasks) * 100)
          : 0
      }));

      return {
        success: true,
        data: {
          projects: projectsWithProgress,
          count: projectsWithProgress.length
        }
      };
    } catch (error) {
      console.error('Get projects by leader error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Create new project
  static async createProject(projectData, createdBy) {
    const {
      project_name,
      description,
      leader_id,
      start_date,
      end_date,
      budget,
      status = ProjectStatus.PLANNING
    } = projectData;

    try {
      const pool = Database.getPool();

      // Validate leader exists
      const [leaderRows] = await pool.execute(
        'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
        [leader_id]
      );

      if (leaderRows.length === 0) {
        return {
          success: false,
          message: 'Project leader not found'
        };
      }

      // Check for duplicate project name
      const [existingRows] = await pool.execute(
        'SELECT project_id FROM projects WHERE project_name = ?',
        [project_name]
      );

      if (existingRows.length > 0) {
        return {
          success: false,
          message: 'Project name already exists'
        };
      }

      // Insert new project
      const [result] = await pool.execute(`
        INSERT INTO projects (
          project_name, description, leader_id, created_by,
          start_date, end_date, budget, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        project_name,
        description,
        leader_id,
        createdBy,
        start_date,
        end_date || null,
        budget || null,
        status
      ]);

      // Log project history
      await this.logProjectHistory(result.insertId, createdBy, 'CREATED', 'Project created');

      console.log(`✅ Project created: ${project_name} (ID: ${result.insertId})`);

      // Get the created project
      const createdProject = await this.getProjectById(result.insertId);
      
      if (createdProject.success) {
        return {
          success: true,
          message: 'Project created successfully',
          data: createdProject.data
        };
      }

      return createdProject;
    } catch (error) {
      console.error('Create project error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Update project
  static async updateProject(projectId, projectData, updatedBy) {
    const {
      project_name,
      description,
      leader_id,
      start_date,
      end_date,
      budget,
      status
    } = projectData;

    try {
      const pool = Database.getPool();

      // Check if project exists
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject.success) {
        return existingProject;
      }

      // Validate leader exists if changing
      if (leader_id && leader_id !== existingProject.data.project.leader_id) {
        const [leaderRows] = await pool.execute(
          'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
          [leader_id]
        );

        if (leaderRows.length === 0) {
          return {
            success: false,
            message: 'Project leader not found'
          };
        }
      }

      // Check for duplicate project name if changing
      if (project_name && project_name !== existingProject.data.project.project_name) {
        const [existingRows] = await pool.execute(
          'SELECT project_id FROM projects WHERE project_name = ? AND project_id != ?',
          [project_name, projectId]
        );

        if (existingRows.length > 0) {
          return {
            success: false,
            message: 'Project name already exists'
          };
        }
      }

      // Update project
      await pool.execute(`
        UPDATE projects 
        SET project_name = ?, description = ?, leader_id = ?, 
            start_date = ?, end_date = ?, budget = ?, status = ?,
            updated_at = NOW()
        WHERE project_id = ?
      `, [
        project_name || existingProject.data.project.project_name,
        description !== undefined ? description : existingProject.data.project.description,
        leader_id || existingProject.data.project.leader_id,
        start_date || existingProject.data.project.start_date,
        end_date !== undefined ? end_date : existingProject.data.project.end_date,
        budget !== undefined ? budget : existingProject.data.project.budget,
        status || existingProject.data.project.status,
        projectId
      ]);

      // Log project history
      await this.logProjectHistory(projectId, updatedBy, 'UPDATED', 'Project details updated');

      console.log(` Project updated: ${projectId}`);

      // Return updated project
      return await this.getProjectById(projectId);
    } catch (error) {
      console.error('Update project error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Update project status
  static async updateProjectStatus(projectId, status, updatedBy) {
    try {
      const pool = Database.getPool();

      // Validate status
      if (!Object.values(ProjectStatus).includes(status)) {
        return {
          success: false,
          message: 'Invalid project status'
        };
      }

      // Check if project exists
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject.success) {
        return existingProject;
      }

      const oldStatus = existingProject.data.project.status;

      // Update project status
      await pool.execute(`
        UPDATE projects 
        SET status = ?, updated_at = NOW()
        WHERE project_id = ?
      `, [status, projectId]);

      // Log project history
      await this.logProjectHistory(
        projectId, 
        updatedBy, 
        'STATUS_CHANGED', 
        `Status changed from ${oldStatus} to ${status}`
      );

      console.log(` Project status updated: ${projectId} -> ${status}`);

      return await this.getProjectById(projectId);
    } catch (error) {
      console.error('Update project status error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Delete project
  static async deleteProject(projectId, deletedBy) {
    try {
      const pool = Database.getPool();

      // Check if project exists
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject.success) {
        return existingProject;
      }

      // Check if project has tasks
      if (existingProject.data.project.total_tasks > 0) {
        return {
          success: false,
          message: 'Cannot delete project with existing tasks'
        };
      }

      // Delete project (hard delete - in production you might want soft delete)
      await pool.execute('DELETE FROM projects WHERE project_id = ?', [projectId]);

      console.log(` Project deleted: ${projectId}`);

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error) {
      console.error('Delete project error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  static async logProjectHistory(projectId, userId, action, description) {
  try {
    const pool = Database.getPool();
    
    await pool.execute(`
      INSERT INTO project_history (
        project_id, user_id, action, description, created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `, [projectId, userId, action, description]);
    
    return { success: true };
  } catch (error) {
    console.error('Log project history error:', error);
    return { success: false };
  }
}


 
}

export default ProjectService;