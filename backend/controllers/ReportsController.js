// controllers/reportsController.js
import express from 'express';
import ReportsService from '../services/ReportsService.js';
import { authenticateToken} from './authController.js';

const router = express.Router();

// GET DASHBOARD STATISTICS API
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const { period, department } = req.query;

    const filters = {};
    if (period) filters.period = period;
    if (department && department !== 'all') filters.department = department;

    const result = await ReportsService.getDashboardStats(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET TASK STATISTICS OVERVIEW API
router.get('/tasks/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { period, project_id } = req.query;

    const filters = {};
    if (period) filters.period = period;
    if (project_id && !isNaN(project_id)) filters.project_id = parseInt(project_id);

    const result = await ReportsService.getTaskStats(filters);

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

// GET PRODUCTIVITY TRENDS API
router.get('/productivity', authenticateToken, async (req, res) => {
  try {
    const { period = 'year' } = req.query;

    if (!['week', 'month', 'quarter', 'year'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: week, month, quarter, year'
      });
    }

    const result = await ReportsService.getProductivityTrends(period);

    if (result.success) {
      res.json({
        success: true,
        message: 'Productivity trends retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get productivity trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// GET TEAM PERFORMANCE API
router.get('/team-performance', authenticateToken, async (req, res) => {
  try {
    const { period, department } = req.query;

    const filters = {};
    if (period) filters.period = period;
    if (department && department !== 'all') filters.department = department;

    const result = await ReportsService.getTeamPerformance(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Team performance retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET PROJECT PROGRESS API
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    const filters = {};
    if (status && status !== 'all') filters.status = status;

    const result = await ReportsService.getProjectProgress(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Project progress retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get project progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET WEEKLY WORKLOAD API
router.get('/workload', authenticateToken, async (req, res) => {
  try {
    const { week } = req.query;

    const filters = {};
    if (week) filters.week = week;

    const result = await ReportsService.getWeeklyWorkload(filters);

    if (result.success) {
      res.json({
        success: true,
        message: 'Weekly workload retrieved successfully',
        data: result.data
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get weekly workload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// EXPORT REPORTS API
router.get('/export/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { period, department, project_id } = req.query;

    if (!['pdf', 'excel', 'detailed-pdf', 'share'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Must be one of: pdf, excel, detailed-pdf, share'
      });
    }

    const filters = {};
    if (period) filters.period = period;
    if (department && department !== 'all') filters.department = department;
    if (project_id) filters.project_id = project_id;

    // For now, we'll create a simple text report
    // In a real implementation, you would use libraries like PDFKit, ExcelJS, etc.
    
    const dashboardStats = await ReportsService.getDashboardStats(filters);
    const taskStats = await ReportsService.getTaskStats(filters);
    
    const reportContent = `
TASK ASSIGNMENT TRACKING SYSTEM - REPORT
=======================================
Generated: ${new Date().toISOString()}
Period: ${period || 'thisMonth'}
Department: ${department || 'all'}

DASHBOARD STATISTICS
-------------------
Total Tasks: ${dashboardStats.data?.totalTasks || 0}
Completion Rate: ${dashboardStats.data?.completionRate || 0}%
Team Efficiency: ${dashboardStats.data?.efficiency || 0}%
Average Workload: ${dashboardStats.data?.workload || 0}%

TASK STATUS BREAKDOWN
--------------------
Completed: ${taskStats.data?.completed || 0}
In Progress: ${taskStats.data?.inProgress || 0}
In Review: ${taskStats.data?.review || 0}
Overdue: ${taskStats.data?.overdue || 0}
To Do: ${taskStats.data?.todo || 0}

Report generated by TATS System
    `;

    if (type === 'share') {
      // For share type, return the report data as JSON
      res.json({
        success: true,
        message: 'Report data prepared for sharing',
        data: {
          content: reportContent,
          filters,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // For PDF/Excel export, return as downloadable file
      const filename = `tats-report-${type}-${Date.now()}.txt`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(reportContent);
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET REPORT INSIGHTS API
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const { period = 'thisMonth', department } = req.query;

    const filters = { period };
    if (department && department !== 'all') filters.department = department;

    // Get data for insights
    const [dashboardStats, taskStats] = await Promise.all([
      ReportsService.getDashboardStats(filters),
      ReportsService.getTaskStats(filters)
    ]);

    const insights = [];

    // Performance insights
    if (dashboardStats.success && dashboardStats.data.efficiency >= 90) {
      insights.push({
        type: 'success',
        title: 'High Performance',
        message: `Team efficiency is at ${dashboardStats.data.efficiency}%. Excellent work!`,
        icon: 'trending-up'
      });
    }

    // Workload insights
    if (dashboardStats.success && dashboardStats.data.workload >= 85) {
      insights.push({
        type: 'warning',
        title: 'High Workload Alert',
        message: `Average workload is at ${dashboardStats.data.workload}%. Consider redistributing tasks.`,
        icon: 'alert-triangle'
      });
    }

    // Completion insights
    if (dashboardStats.success && dashboardStats.data.completionRate >= 85) {
      insights.push({
        type: 'info',
        title: 'Goal Achievement',
        message: `${dashboardStats.data.completionRate}% completion rate meets our target!`,
        icon: 'target'
      });
    }

    // Overdue tasks insights
    if (taskStats.success && taskStats.data.overdue > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue Tasks',
        message: `${taskStats.data.overdue} tasks are overdue. Review and prioritize.`,
        icon: 'clock'
      });
    }

    res.json({
      success: true,
      message: 'Report insights retrieved successfully',
      data: insights
    });
  } catch (error) {
    console.error('Get report insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET REPORT METADATA API
router.get('/metadata', authenticateToken, async (req, res) => {
  try {
    const metadata = {
      availablePeriods: [
        { value: 'thisWeek', label: 'This Week' },
        { value: 'thisMonth', label: 'This Month' },
        { value: 'thisQuarter', label: 'This Quarter' },
        { value: 'thisYear', label: 'This Year' }
      ],
      availableDepartments: [
        { value: 'all', label: 'All Departments' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'design', label: 'Design' },
        { value: 'qa', label: 'Quality Assurance' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' }
      ],
      exportTypes: [
        { value: 'pdf', label: 'PDF Report' },
        { value: 'excel', label: 'Excel Spreadsheet' },
        { value: 'detailed-pdf', label: 'Detailed PDF Report' },
        { value: 'share', label: 'Shareable Link' }
      ],
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Report metadata retrieved successfully',
      data: metadata
    });
  } catch (error) {
    console.error('Get report metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;