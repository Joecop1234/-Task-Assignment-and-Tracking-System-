import express from 'express';
import ProjectService, { ProjectStatus } from '../services/ProjectService.js';
import { authenticateToken, requireRole } from './authController.js';

const router = express.Router();

// User roles enum
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

// GET ALL PROJECTS API
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      leader_id, 
      created_by, 
      search,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    // Build filters object
    const filters = {};
    if (status) filters.status = status;
    if (leader_id && !isNaN(leader_id)) filters.leader_id = parseInt(leader_id);
    if (created_by && !isNaN(created_by)) filters.created_by = parseInt(created_by);
    if (search) filters.search = search;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    const result = await ProjectService.getAllProjects(filters);

    if (result.success) {
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedProjects = result.data.projects.slice(startIndex, endIndex);

      res.json({
        success: true,
        message: 'Projects retrieved successfully',
        data: {
          projects: paginatedProjects,
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
    console.error('Get all projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET PROJECT BY ID API
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const result = await ProjectService.getProjectById(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'Project found',
        data: result.data
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET MY PROJECTS API (Projects where user is leader)
router.get('/my/projects', authenticateToken, async (req, res) => {
  try {
    const result = await ProjectService.getProjectsByLeader(req.user.userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User projects retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// GET PROJECT STATISTICS API
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { leader_id, status } = req.query;
    
    const filters = {};
    if (leader_id && !isNaN(leader_id)) filters.leader_id = parseInt(leader_id);
    if (status) filters.status = status;

    const result = await ProjectService.getProjectStats(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Project statistics retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// CREATE PROJECT API
router.post('/', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const {
      project_name,
      description,
      leader_id,
      start_date,
      end_date,
      budget,
      status
    } = req.body;

    // Basic validation
    if (!project_name || !leader_id || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Project name, leader ID, and start date are required'
      });
    }

    if (project_name.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Project name must be at least 3 characters'
      });
    }

    if (isNaN(leader_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid leader ID is required'
      });
    }

    // Validate status if provided
    if (status && !Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project status'
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Validate budget if provided
    if (budget && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be a non-negative number'
      });
    }

    const projectData = {
      project_name,
      description,
      leader_id: parseInt(leader_id),
      start_date,
      end_date: end_date || null,
      budget: budget ? parseFloat(budget) : null,
      status: status || ProjectStatus.PLANNING
    };

    const result = await ProjectService.createProject(projectData, req.user.userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// UPDATE PROJECT API
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project_name,
      description,
      leader_id,
      start_date,
      end_date,
      budget,
      status
    } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    // Validate leader_id if provided
    if (leader_id && isNaN(leader_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid leader ID is required'
      });
    }

    // Validate status if provided
    if (status && !Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project status'
      });
    }

    // Validate dates if provided
    if (start_date) {
      const startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
    }

    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }

      if (start_date && endDate <= new Date(start_date)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Validate budget if provided
    if (budget !== undefined && budget !== null && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be a non-negative number'
      });
    }

    const projectData = {
      project_name,
      description,
      leader_id: leader_id ? parseInt(leader_id) : undefined,
      start_date,
      end_date,
      budget: budget !== undefined ? parseFloat(budget) : undefined,
      status
    };

    // Remove undefined values
    Object.keys(projectData).forEach(key => 
      projectData[key] === undefined && delete projectData[key]
    );

    const result = await ProjectService.updateProject(parseInt(id), projectData, req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// UPDATE PROJECT STATUS API
router.put('/:id/status', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const result = await ProjectService.updateProjectStatus(parseInt(id), status, req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE PROJECT API
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const result = await ProjectService.deleteProject(parseInt(id), req.user.userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});




export default router;