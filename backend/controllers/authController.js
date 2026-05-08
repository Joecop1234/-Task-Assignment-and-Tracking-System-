import express from 'express';
import rateLimit from 'express-rate-limit';
import AuthService from '../services/authService.js';
import Database from '../database/database.js';

const router = express.Router();

// User roles enum
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper functions
const removePassword = (user) => {
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const pool = Database.getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE is_active = TRUE ORDER BY created_at DESC'
    );

    const users = rows.map(user => removePassword(user));

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// LOGIN API
router.post('/login', authLimiter, async (req, res) => {
  try {
    console.log('LOGIN REQUEST:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    console.log('Calling AuthService.login with:', username);
    
    // ตรวจสอบว่า AuthService มีจริงหรือไม่
    if (!AuthService || typeof AuthService.login !== 'function') {
      throw new Error('AuthService.login is not available');
    }
    
    const result = await AuthService.login(username, password);
    console.log('AuthService result:', result);

    if (result && result.success) {
      console.log(`Login successful: ${username}`);
      res.json({
        success: true,
        message: 'Login successful',
        data: result.data
      });
    } else {
      console.log('Login failed:', result);
      res.status(401).json(result || { success: false, message: 'Login failed' });
    }
  } catch (error) {
    console.error('LOGIN ERROR:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// REGISTER API
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role = UserRole.EMPLOYEE } = req.body;

    // Basic validation
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // ใช้ AuthService.register
    const result = await AuthService.register({
      username,
      email,
      password,
      first_name,
      last_name,
      role
    });

    if (result.success) {
      console.log(`✅ Registration successful: ${username} (${role})`);
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result.data
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET CURRENT USER API
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // ใช้ AuthService.getUserById
    const result = await AuthService.getUserById(req.user.userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User found',
        data: result.data
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// CHANGE PASSWORD API
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// LOGOUT API
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const result = await AuthService.logout(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET ALL USERS API (Admin only)


// GET USER STATS API (Admin only)
router.get('/admin/stats', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const pool = Database.getPool();
    
    const [totalRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [activeRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
    const [roleRows] = await pool.execute(
      'SELECT role, COUNT(*) as count FROM users WHERE is_active = TRUE GROUP BY role'
    );

    const roleStats = roleRows.reduce((acc, row) => {
      acc[row.role.toLowerCase() + 's'] = row.count;
      return acc;
    }, {});

    const stats = {
      total: totalRows[0].count,
      active: activeRows[0].count,
      admins: roleStats.admins || 0,
      managers: roleStats.managers || 0,
      employees: roleStats.employees || 0
    };

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// SEARCH USERS API (Admin/Manager only)
router.get('/users/search', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }

    const pool = Database.getPool();
    const term = `%${searchTerm.trim()}%`;
    const [rows] = await pool.execute(
      `SELECT * FROM users 
       WHERE is_active = TRUE 
       AND (first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR email LIKE ?)
       ORDER BY first_name, last_name`,
      [term, term, term, term]
    );

    const users = rows.map(user => removePassword(user));

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: {
        users,
        count: users.length,
        searchTerm: searchTerm.trim()
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET USERS BY ROLE API (Admin/Manager only)
router.get('/users/role/:role', authenticateToken, requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be ADMIN, MANAGER, or EMPLOYEE'
      });
    }

    const pool = Database.getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE role = ? AND is_active = TRUE ORDER BY first_name, last_name',
      [role]
    );

    const users = rows.map(user => removePassword(user));

    res.json({
      success: true,
      message: `${role}s retrieved successfully`,
      data: {
        users,
        count: users.length,
        role
      }
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// REFRESH TOKEN API
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/users/assignable', authenticateToken, async (req, res) => {
  try {
    const pool = Database.getPool();
    const [rows] = await pool.execute(
      'SELECT user_id, first_name, last_name, username, email FROM users WHERE is_active = TRUE ORDER BY first_name, last_name'
    );

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: rows,
        count: rows.length
      }
    });
  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
router.delete('/users/:id', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = Database.getPool();

    // ห้ามลบตัวเอง
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // เช็คว่า user มีอยู่จริง
    const [existing] = await pool.execute('SELECT user_id, username FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete
    await pool.execute('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = ?', [id]);

    console.log(`🗑️ User deleted (soft): ${existing[0].username} (ID: ${id}) by ${req.user.username}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// UPDATE USER (Admin only)
router.put('/users/:id', authenticateToken, requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, department, position, phone, is_active } = req.body;
    const pool = Database.getPool();

    // เช็คว่า user มีอยู่จริง
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate role ถ้ามีส่ง
    if (role && !Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // เช็ค email ซ้ำ (ถ้ามีการเปลี่ยน)
    if (email) {
      const [emailCheck] = await pool.execute(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    await pool.execute(
      `UPDATE users SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        department = ?,
        position = ?,
        phone = ?,
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE user_id = ?`,
      [first_name, last_name, email, role, department || null, position || null, phone || null, is_active, id]
    );

    // ดึงข้อมูลใหม่
    const [updated] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [id]);
    const user = removePassword(updated[0]);

    console.log(`✏️ User updated: ID ${id} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export { authenticateToken, requireRole };
export default router;