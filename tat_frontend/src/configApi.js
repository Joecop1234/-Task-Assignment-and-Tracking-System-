// Simple API Configuration with axios
import axios from 'axios';

const getToken = () => localStorage.getItem("token");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const config = {
  // API Base URL - ปรับให้ตรงกับ backend port ที่แท้จริง
  api_path: "/api",
  
  // Token storage key name
  token_name: "token",
  
  // Socket URL for real-time features (if needed)
  socket_url: "/",
  
  // Request timeout (10 seconds)
  timeout: 10000,
  
  // Get headers with authorization
  getHeaders: () => ({
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${getToken()}`
    }
  }),
  
  // Get headers without authorization (for login, register, etc.)
  getPublicHeaders: () => ({
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }),
  
  // Build full API URL
  buildUrl: (endpoint) => {
    const baseUrl = config.api_path.endsWith('/') 
      ? config.api_path.slice(0, -1) 
      : config.api_path;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }
};

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: config.api_path,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (reqConfig) => {
    const token = getToken();
    if (token && reqConfig.url !== API_ROUTES.LOGIN) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ FIX: ไม่บังคับ Content-Type เมื่อส่ง FormData
    // ให้ axios จัดการ Content-Type เอง (จะใส่ multipart/form-data + boundary อัตโนมัติ)
    if (reqConfig.data instanceof FormData) {
      delete reqConfig.headers['Content-Type'];
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`, {
        headers: reqConfig.headers,
        data: reqConfig.data instanceof FormData ? '[FormData]' : reqConfig.data
      });
    }
    
    return reqConfig;
  },
  (error) => {
    debugLog('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status}`, response.data);
    }
    return response;
  },
  (error) => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Error Details]`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data instanceof FormData ? '[FormData]' : error.config?.data,
          headers: error.config?.headers
        }
      });
    }
    
    // Handle common errors
    if (error.response?.status === 401) {
      console.warn('Authentication failed - token may be expired');
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - backend may be down');
    }
    
    if (!error.response) {
      console.error('Network error - backend may be unreachable');
    }
    
    return Promise.reject(error);
  }
);

// API Routes - simplified structure
export const API_ROUTES = {
  // Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH_TOKEN: '/auth/refresh-token',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // Users
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,
  
  // Projects
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id) => `/projects/${id}`,
  MY_PROJECTS: '/projects/my',
  
  // Tasks
  TASKS: '/tasks',
  TASK_BY_ID: (id) => `/tasks/${id}`,
  MY_TASKS: '/tasks/my',
  UPDATE_TASK_STATUS: (id) => `/tasks/${id}/status`,
  ASSIGN_TASK: (id) => `/tasks/${id}/assign`,
  
  // Files
  UPLOAD_FILE: '/files/upload',
  BULK_UPLOAD: '/files/bulk-upload',
  FILE_BY_ID: (id) => `/files/${id}`,
  DOWNLOAD_FILE: (id) => `/files/${id}/download`,
  FILES_BY_RELATED: (type, id) => `/files/related/${type}/${id}`,
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  MARK_ALL_READ: '/notifications/mark-all-read',
  TASK_NOTIFICATION: '/notifications/task-notification',
  
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats'
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Simple error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error - please check your connection',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  SERVER_ERROR: 'Server error - please try again later',
  UNKNOWN_ERROR: 'An unexpected error occurred'
};

// Get error message from response
export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

// Debug logger (only in development)
export const debugLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Debug] ${message}`, data || '');
  }
};

export default config;