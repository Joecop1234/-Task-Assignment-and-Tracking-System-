import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from '../database/database.js';

// ไม่ต้องสร้าง pool ตรงนี้ เพราะจะได้จาก Database.getPool() เมื่อต้องการใช้

class AuthService {
  static JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
  static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  static BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

  // Password utilities
  static async hashPassword(password) {
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // JWT utilities
  static generateToken(payload) {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'tats-system',
      audience: 'tats-users'
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'tats-system',
        audience: 'tats-users'
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Login user
  static async login(username, password) {
    try {
      const pool = Database.getPool(); 
      
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username]
      );

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
const user = rows[0];

// ตรวจสอบว่า password_hash เป็น plain text หรือ bcrypt hash
let isPasswordValid;
if (user.password_hash.startsWith('$2')) {
  // bcrypt hash
  isPasswordValid = await this.verifyPassword(password, user.password_hash);
} else {
  // plain text (สำหรับข้อมูลเก่า)
  isPasswordValid = password === user.password_hash;
}
    


      // Generate JWT token
      const token = this.generateToken({
        userId: user.user_id,
        username: user.username,
        role: user.role
      });
      
      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Register new user
  static async register(userData) {
    const { username, email, password, first_name, last_name, role = 'EMPLOYEE' } = userData;

    try {
      const pool = Database.getPool(); // ย้าย pool มาใช้ตรงนี้
      
      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT user_id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUsers.length > 0) {
        return {
          success: false,
          message: 'Username or email already exists'
        };
      }
      
      const password_hash = await this.hashPassword(password);

      // Insert new user
      const [result] = await pool.execute(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, email, password_hash, first_name, last_name, role]
      );
      
      const [newUserRows] = await pool.execute(
        'SELECT * FROM users WHERE user_id = ?',
        [result.insertId]
      );

      const newUser = newUserRows[0];

      // Generate JWT token
      const token = this.generateToken({
        userId: newUser.user_id,
        username: newUser.username,
        role: newUser.role
      });

      // Remove password from user object
      const { password_hash: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const pool = Database.getPool(); // ย้าย pool มาใช้ตรงนี้
      
      // Get current user
      const [rows] = await pool.execute(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = rows[0];
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      const newPasswordHash = await this.hashPassword(newPassword);
      await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?',
        [newPasswordHash, userId]
      );

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      // Generate new token
      const newToken = this.generateToken({
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      });

      return {
        success: true,
        data: { token: newToken }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  // Logout
  static async logout(userId) {
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      const pool = Database.getPool();
      
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      if (rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const { password_hash, ...userWithoutPassword } = rows[0];

      return {
        success: true,
        data: {
          user: userWithoutPassword
        }
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}

export default AuthService;