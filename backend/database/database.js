import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  static pool = null;

  static initialize() {
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tats_system',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    this.pool = mysql.createPool(poolConfig);
    console.log('📦 Database pool initialized');
  }

  static getPool() {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  static async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  // static async initializeTables() {
  //   try {
  //     console.log('🔧 Initializing database tables...');

  //     // Users table
  //     const createUsersTable = `
  //       CREATE TABLE IF NOT EXISTS users (
  //         user_id INT AUTO_INCREMENT PRIMARY KEY,
  //         username VARCHAR(50) UNIQUE NOT NULL,
  //         email VARCHAR(100) UNIQUE NOT NULL,
  //         password_hash VARCHAR(255) NOT NULL,
  //         first_name VARCHAR(50) NOT NULL,
  //         last_name VARCHAR(50) NOT NULL,
  //         role ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
  //         department VARCHAR(100),
  //         position VARCHAR(100),
  //         phone VARCHAR(20),
  //         location VARCHAR(100),
  //         bio TEXT,
  //         avatar_url VARCHAR(255),
  //         is_active BOOLEAN DEFAULT TRUE,
  //         last_login TIMESTAMP NULL,
  //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  //         INDEX idx_username (username),
  //         INDEX idx_email (email),
  //         INDEX idx_role (role)
  //       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  //     `;

  //     // Projects table
  //     const createProjectsTable = `
  //       CREATE TABLE IF NOT EXISTS projects (
  //         project_id INT AUTO_INCREMENT PRIMARY KEY,
  //         project_name VARCHAR(200) NOT NULL,
  //         description TEXT,
  //         leader_id INT,
  //         created_by INT NOT NULL,
  //         start_date DATE,
  //         end_date DATE,
  //         status ENUM('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNING',
  //         priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  //         budget DECIMAL(15,2),
  //         actual_cost DECIMAL(15,2),
  //         progress INT DEFAULT 0,
  //         color VARCHAR(20) DEFAULT 'blue',
  //         is_archived BOOLEAN DEFAULT FALSE,
  //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  //         FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE SET NULL,
  //         FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  //         INDEX idx_status (status),
  //         INDEX idx_priority (priority),
  //         INDEX idx_leader (leader_id)
  //       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  //     `;

  //     // Tasks table
  //     const createTasksTable = `
  //       CREATE TABLE IF NOT EXISTS tasks (
  //         task_id INT AUTO_INCREMENT PRIMARY KEY,
  //         task_title VARCHAR(200) NOT NULL,
  //         task_description TEXT,
  //         project_id INT,
  //         assigned_to INT,
  //         created_by INT NOT NULL,
  //         priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  //         status ENUM('TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED') DEFAULT 'TO_DO',
  //         start_date DATE,
  //         due_date DATE,
  //         estimated_hours DECIMAL(6,2),
  //         actual_hours DECIMAL(6,2),
  //         progress INT DEFAULT 0,
  //         tags JSON,
  //         parent_task_id INT,
  //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  //         FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  //         FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
  //         FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  //         FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE SET NULL,
  //         INDEX idx_status (status),
  //         INDEX idx_priority (priority),
  //         INDEX idx_assigned (assigned_to),
  //         INDEX idx_project (project_id),
  //         INDEX idx_due_date (due_date)
  //       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  //     `;

  //     // Task files table
  //     const createTaskFilesTable = `
  //       CREATE TABLE IF NOT EXISTS task_files (
  //         file_id INT AUTO_INCREMENT PRIMARY KEY,
  //         task_id INT NOT NULL,
  //         file_name VARCHAR(255) NOT NULL,
  //         original_name VARCHAR(255) NOT NULL,
  //         file_path VARCHAR(500) NOT NULL,
  //         file_type VARCHAR(10),
  //         file_size BIGINT,
  //         mime_type VARCHAR(100),
  //         uploaded_by INT NOT NULL,
  //         uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  //         FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  //         INDEX idx_task (task_id),
  //         INDEX idx_uploaded_by (uploaded_by)
  //       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  //     `;

  //     // Notifications table
  //     const createNotificationsTable = `
  //       CREATE TABLE IF NOT EXISTS notifications (
  //         notification_id INT AUTO_INCREMENT PRIMARY KEY,
  //         user_id INT NOT NULL,
  //         task_id INT,
  //         project_id INT,
  //         type ENUM('TASK_ASSIGNED', 'TASK_UPDATED', 'PROJECT_UPDATED', 'DEADLINE_REMINDER', 'GENERAL') NOT NULL,
  //         title VARCHAR(200) NOT NULL,
  //         message TEXT NOT NULL,
  //         is_read BOOLEAN DEFAULT FALSE,
  //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  //         FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  //         FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  //         INDEX idx_user (user_id),
  //         INDEX idx_read (is_read),
  //         INDEX idx_type (type)
  //       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  //     `;

  //     // Execute table creation
  //     await this.pool.execute(createUsersTable);
  //     console.log('✅ Users table created/verified successfully');

  //     await this.pool.execute(createProjectsTable);
  //     console.log('✅ Projects table created/verified successfully');

  //     await this.pool.execute(createTasksTable);
  //     console.log('✅ Tasks table created/verified successfully');

  //     await this.pool.execute(createTaskFilesTable);
  //     console.log('✅ Task files table created/verified successfully');

  //     await this.pool.execute(createNotificationsTable);
  //     console.log('✅ Notifications table created/verified successfully');

  //     // Create default admin user
  //     await this.createDefaultAdmin();
      
  //   } catch (error) {
  //     console.error('❌ Database initialization failed:', error);
  //     throw error;
  //   }
  // }

  // static async createDefaultAdmin() {
  //   try {
  //     const [rows] = await this.pool.execute(
  //       'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN"'
  //     );
      
  //     if (rows[0].count === 0) {
  //       const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  //       const hashedPassword = await bcrypt.hash('admin123', saltRounds);
        
  //       await this.pool.execute(
  //         `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
  //          VALUES (?, ?, ?, ?, ?, ?)`,
  //         ['admin', 'admin@tats.com', hashedPassword, 'System', 'Administrator', 'ADMIN']
  //       );
        
  //       console.log('Default admin user created - admin/admin123');
  //     }
  //   } catch (error) {
  //     console.error('Failed to create default admin:', error);
  //   }
  // }

  static async closePool() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('Database pool closed');
      }
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  }
}

export default Database;