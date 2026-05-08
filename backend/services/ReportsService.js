
import Database from '../database/database.js';

class ReportsService {
  // Get dashboard statistics
  static async getDashboardStats(filters = {}) {
    try {
      const pool = Database.getPool();
      const { period = 'thisMonth', department } = filters;
      
      // Build date range based on period
      const dateRange = this.getDateRange(period);
      
      // Base queries with date filtering
      let whereClause = `WHERE t.created_at >= ? AND t.created_at <= ?`;
      let params = [dateRange.start, dateRange.end];
      
      if (department && department !== 'all') {
        whereClause += ` AND u.department = ?`;
        params.push(department);
      }
      
      // Get total tasks
      const [totalTasksResult] = await pool.execute(
        `SELECT COUNT(*) as count FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.user_id 
         ${whereClause}`,
        params
      );
      
      // Get completed tasks
      const [completedTasksResult] = await pool.execute(
        `SELECT COUNT(*) as count FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.user_id 
         ${whereClause} AND t.status = 'DONE'`,
        params
      );
      
      // Get previous period for comparison
      const prevDateRange = this.getDateRange(period, true);
      const [prevTotalResult] = await pool.execute(
        `SELECT COUNT(*) as count FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.user_id 
         WHERE t.created_at >= ? AND t.created_at <= ?`,
        [prevDateRange.start, prevDateRange.end]
      );
      
      const totalTasks = totalTasksResult[0].count;
      const completedTasks = completedTasksResult[0].count;
      const prevTotal = prevTotalResult[0].count;
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const tasksChange = prevTotal > 0 ? Math.round(((totalTasks - prevTotal) / prevTotal) * 100) : 0;
      
      // Calculate team efficiency (mock calculation)
      const efficiency = Math.min(95, 75 + Math.round(completionRate * 0.2));
      
      // Calculate average workload (mock calculation)
      const workload = Math.round(65 + Math.random() * 20);
      
      return {
        success: true,
        data: {
          totalTasks,
          completionRate,
          efficiency,
          workload,
          tasksChange: `${tasksChange >= 0 ? '+' : ''}${tasksChange}%`,
          completionChange: `+${Math.round(Math.random() * 5)}%`,
          efficiencyChange: `+${Math.round(Math.random() * 3)}%`,
          workloadChange: `-${Math.round(Math.random() * 2)}%`
        }
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        message: 'Failed to get dashboard statistics'
      };
    }
  }

  // Get task statistics overview
  static async getTaskStats(filters = {}) {
    try {
      const pool = Database.getPool();
      const { period = 'thisMonth', project_id } = filters;
      
      const dateRange = this.getDateRange(period);
      let whereClause = `WHERE created_at >= ? AND created_at <= ?`;
      let params = [dateRange.start, dateRange.end];
      
      if (project_id) {
        whereClause += ` AND project_id = ?`;
        params.push(project_id);
      }
      
      // Get task counts by status
      const [statusResults] = await pool.execute(
        `SELECT 
          status,
          COUNT(*) as count,
          SUM(CASE WHEN due_date < NOW() AND status != 'DONE' THEN 1 ELSE 0 END) as overdue_count
         FROM tasks 
         ${whereClause}
         GROUP BY status`,
        params
      );
      
      const stats = {
        completed: 0,
        inProgress: 0,
        review: 0,
        overdue: 0,
        todo: 0
      };
      
      statusResults.forEach(row => {
        switch (row.status) {
          case 'DONE':
            stats.completed = row.count;
            break;
          case 'INPROGRESS':
            stats.inProgress = row.count;
            break;
          case 'REVIEW':
            stats.review = row.count;
            break;
          case 'TODO':
            stats.todo = row.count;
            break;
        }
      });
      
      // Count overdue tasks
      const [overdueResult] = await pool.execute(
        `SELECT COUNT(*) as count FROM tasks 
         ${whereClause} AND due_date < NOW() AND status != 'DONE'`,
        params
      );
      
      stats.overdue = overdueResult[0].count;
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting task stats:', error);
      return {
        success: false,
        message: 'Failed to get task statistics'
      };
    }
  }

  // Get productivity trends
  static async getProductivityTrends(period = 'year') {
    try {
      const pool = Database.getPool();
      
      let groupBy, dateFormat;
      if (period === 'year') {
        groupBy = 'MONTH(created_at)';
        dateFormat = 'DATE_FORMAT(created_at, "%b")';
      } else {
        groupBy = 'DATE(created_at)';
        dateFormat = 'DATE_FORMAT(created_at, "%m/%d")';
      }
      
      const [results] = await pool.execute(
        `SELECT 
          ${dateFormat} as period,
          COUNT(*) as tasks,
          SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as completed,
          ROUND(AVG(CASE WHEN status = 'DONE' THEN 100 ELSE 0 END), 0) as efficiency
         FROM tasks 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
         GROUP BY ${groupBy}, ${dateFormat}
         ORDER BY created_at`
      );
      
      return {
        success: true,
        data: results.map(row => ({
          month: row.period,
          tasks: row.tasks,
          completed: row.completed,
          efficiency: row.efficiency
        }))
      };
    } catch (error) {
      console.error('Error getting productivity trends:', error);
      return {
        success: false,
        message: 'Failed to get productivity trends'
      };
    }
  }

  // Get department performance
  static async getDepartmentPerformance(filters = {}) {
    try {
      const pool = Database.getPool();
      const { period = 'thisMonth' } = filters;
      
      const dateRange = this.getDateRange(period);
      
      // Get tasks by department (assuming users have department field)
      const [results] = await pool.execute(
        `SELECT 
          COALESCE(u.department, 'Unassigned') as name,
          COUNT(t.task_id) as tasks,
          SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completed,
          ROUND(AVG(CASE WHEN t.status = 'DONE' THEN 100 ELSE 0 END), 0) as efficiency,
          COUNT(DISTINCT u.user_id) as members
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.user_id
         WHERE t.created_at >= ? AND t.created_at <= ?
         GROUP BY u.department
         ORDER BY completed DESC`,
        [dateRange.start, dateRange.end]
      );
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error getting department performance:', error);
      return {
        success: false,
        message: 'Failed to get department performance'
      };
    }
  }

  // Get team performance
  static async getTeamPerformance(filters = {}) {
  try {
    const pool = Database.getPool();
    const { period = 'thisMonth', department } = filters;
    
    const dateRange = this.getDateRange(period);
    let whereClause = `WHERE t.created_at >= ? AND t.created_at <= ?`;
    let params = [dateRange.start, dateRange.end];
    
    if (department && department !== 'all') {
      whereClause += ` AND u.department = ?`;
      params.push(department);
    }
    
    const [results] = await pool.execute(
      `SELECT 
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COUNT(t.task_id) as tasksCompleted,
        ROUND(AVG(CASE WHEN t.status = 'DONE' THEN 100 ELSE 0 END), 0) as efficiency,
        ROUND(75 + RAND() * 25, 0) as workload
       FROM users u
       LEFT JOIN tasks t ON u.user_id = t.assigned_to AND t.created_at >= ? AND t.created_at <= ?
       WHERE u.role = 'EMPLOYEE'
       GROUP BY u.user_id, u.first_name, u.last_name
       ORDER BY tasksCompleted DESC
       LIMIT 10`,
      [dateRange.start, dateRange.end]
    );
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error getting team performance:', error);
    return {
      success: false,
      message: 'Failed to get team performance'
    };
  }
}

  // Get project progress
  async getProjectProgress() {
  try {
    const pool = Database.getPool();
    
    // Fixed query - removed p.is_active and filter by status instead
    const query = `
      SELECT 
        p.project_name as name,
        ROUND(
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.project_id AND status = 'DONE') * 100.0 /
          NULLIF((SELECT COUNT(*) FROM tasks WHERE project_id = p.project_id), 0), 0
        ) as progress,
        DATEDIFF(p.end_date, NOW()) as daysLeft,
        p.status,
        p.end_date
      FROM projects p
      WHERE p.status IN ('PLANNING', 'ACTIVE', 'ON_HOLD')  -- Only show active projects
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    
    const [rows] = await pool.execute(query);
    
    return {
      success: true,
      data: rows
    };
  } catch (error) {
    console.error('Error getting project progress:', error);
    throw error;
  }
}

  // Get weekly workload
  static async getWeeklyWorkload(filters = {}) {
    try {
      const pool = Database.getPool();
      
      // Get workload for each day of current week
      const [results] = await pool.execute(
        `SELECT 
          DAYNAME(created_at) as day,
          COUNT(*) as workload,
          100 as capacity
         FROM tasks 
         WHERE WEEK(created_at) = WEEK(NOW()) 
         AND YEAR(created_at) = YEAR(NOW())
         GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
         ORDER BY DAYOFWEEK(created_at)`
      );
      
      // Ensure all days are present
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const workloadData = daysOfWeek.map(day => {
        const found = results.find(r => r.day === day);
        return {
          day: day.substring(0, 3), // Mon, Tue, etc.
          workload: found ? Math.min(100, found.workload * 5) : 0, // Scale up for percentage
          capacity: 100
        };
      });
      
      return {
        success: true,
        data: workloadData
      };
    } catch (error) {
      console.error('Error getting weekly workload:', error);
      return {
        success: false,
        message: 'Failed to get weekly workload'
      };
    }
  }

  // Helper method to get date ranges
  static getDateRange(period, previous = false) {
    const now = new Date();
    let start, end;
    
    switch (period) {
      case 'thisWeek':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        end = new Date(now.setDate(start.getDate() + 6));
        if (previous) {
          start.setDate(start.getDate() - 7);
          end.setDate(end.getDate() - 7);
        }
        break;
        
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (previous) {
          start.setMonth(start.getMonth() - 1);
          end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        }
        break;
        
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        if (previous) {
          start.setMonth(start.getMonth() - 3);
          end.setMonth(end.getMonth() - 3);
        }
        break;
        
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        if (previous) {
          start.setFullYear(start.getFullYear() - 1);
          end.setFullYear(end.getFullYear() - 1);
        }
        break;
        
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
}

export default ReportsService;