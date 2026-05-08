CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    position VARCHAR(100) DEFAULT NULL,
    date_hired DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Projects Table
-- ==========================================
CREATE TABLE projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    leader_id INT NOT NULL,
    created_by INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    budget DECIMAL(15,2) DEFAULT NULL,
    status ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNING',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    color VARCHAR(7) DEFAULT '#3B82F6', -- HEX color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    INDEX idx_project_name (project_name),
    INDEX idx_leader (leader_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Tasks Table
-- ==========================================
CREATE TABLE tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT,
    project_id INT NOT NULL,
    assigned_to INT DEFAULT NULL,
    created_by INT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE') DEFAULT 'TO_DO',
    start_date DATE DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    completed_date DATE DEFAULT NULL,
    estimated_hours DECIMAL(8,2) DEFAULT NULL,
    actual_hours DECIMAL(8,2) DEFAULT NULL,
    progress_percentage TINYINT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    tags JSON DEFAULT NULL, -- Store tags as JSON array
    custom_fields JSON DEFAULT NULL, -- Store custom fields as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    INDEX idx_task_title (task_title),
    INDEX idx_project (project_id),
    INDEX idx_assigned (assigned_to),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_status_assigned (status, assigned_to),
    INDEX idx_project_status (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Files Table
-- ==========================================
CREATE TABLE files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL, -- Unique filename on disk
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL, -- File size in bytes
    category ENUM('IMAGE', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'ARCHIVE', 'VIDEO', 'AUDIO', 'OTHER') DEFAULT 'OTHER',
    related_type ENUM('task', 'project', 'user') NOT NULL,
    related_id INT NOT NULL,
    description TEXT DEFAULT NULL,
    uploaded_by INT NOT NULL,
    download_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    INDEX idx_filename (filename),
    INDEX idx_related (related_type, related_id),
    INDEX idx_category (category),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_mime_type (mime_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Notifications Table
-- ==========================================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('TASK_ASSIGNED', 'TASK_STATUS_UPDATED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 
             'PROJECT_CREATED', 'PROJECT_STATUS_UPDATED', 'MENTION', 'COMMENT_ADDED', 
             'FILE_UPLOADED', 'SYSTEM_ANNOUNCEMENT') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_id INT DEFAULT NULL, -- ID of related task/project
    related_type ENUM('task', 'project', 'user') DEFAULT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_by INT DEFAULT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_priority (priority),
    INDEX idx_related (related_type, related_id),
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
