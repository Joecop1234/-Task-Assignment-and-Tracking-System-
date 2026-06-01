// AuthContext.jsx - Updated version
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import config, { API_ROUTES, HTTP_STATUS, getErrorMessage, debugLog } from '../configApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  // Session timeout duration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Simple API call helper with error handling
  const apiCall = async (endpoint, options = {}) => {
    try {
      const url = config.buildUrl(endpoint);
      const headers = options.requireAuth !== false ? config.getHeaders() : config.getPublicHeaders();
      
      const fetchOptions = {
        method: options.method || 'GET',
        ...headers,
        ...options
      };

      debugLog(`API Call: ${fetchOptions.method} ${url}`, fetchOptions);

      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      debugLog(`API Response: ${response.status}`, data);

      return { success: true, data, status: response.status };
    } catch (error) {
      debugLog('API Error:', error);
      return { 
        success: false, 
        message: getErrorMessage(error),
        status: error.response?.status
      };
    }
  };

  // Enhanced token verification with automatic refresh
  const verifyToken = async (token) => {
    try {
      const response = await fetch(config.buildUrl(API_ROUTES.ME), {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        return true;
      } else if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResult = await refreshAuthToken(refreshToken);
          if (refreshResult.success) {
            return true;
          }
        }
        return false;
      }
      return false;
    } catch (error) {
      debugLog('Token verification error:', error);
      return false;
    }
  };

  const refreshAuthToken = async (refreshToken) => {
    try {
      const response = await apiCall(API_ROUTES.REFRESH_TOKEN, {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({ refreshToken })
      });

      if (response.success) {
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.message || 'Token refresh failed' 
        };
      }
    } catch (error) {
      debugLog('Token refresh error:', error);
      return { 
        success: false, 
        message: 'Network error during token refresh'
      };
    }
  };

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        const isValidToken = await verifyToken(token);
        
        if (isValidToken) {
          setUser(parsedUser);
          setIsAuthenticated(true);
          setupSessionTimeout();
        } else {
          clearAuthData();
        }
      } catch (error) {
        debugLog('Error parsing user data:', error);
        clearAuthData();
      }
    }
    setIsLoading(false);
  };

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    clearTimeout(sessionTimeout);
    setSessionTimeout(null);
  }, [sessionTimeout]);

  const setupSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const timeout = setTimeout(() => {
      debugLog('Session expired due to inactivity');
      logout(true);
    }, SESSION_TIMEOUT);

    setSessionTimeout(timeout);
  }, [sessionTimeout]);

  const resetSessionTimeout = useCallback(() => {
    if (isAuthenticated) {
      setupSessionTimeout();
    }
  }, [isAuthenticated, setupSessionTimeout]);

  // Enhanced login - now returns navigation info instead of navigating directly
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      
      console.log('=== LOGIN DEBUG ===');
      console.log('Credentials being sent:', credentials);
      console.log('API Endpoint:', API_ROUTES.LOGIN);
      console.log('Full URL:', `${config.api_path}${API_ROUTES.LOGIN}`);
      
      const response = await apiCall(API_ROUTES.LOGIN, {
        method: 'POST',
        data: credentials
      });

      console.log('Raw API Response:', response);

      if (response.success) {
        const { token, refreshToken, user } = response.data.data || response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        setUser(user);
        setIsAuthenticated(true);
        setupSessionTimeout();
        
        debugLog('Login successful:', user);
        
        return { 
          success: true, 
          user: user,
          redirectPath: getRedirectPath(user.role),
          message: response.data.message || 'Login successful'
        };
      } else {
        console.log('Login failed with message:', response.message);
        return { 
          success: false, 
          message: response.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error details:', error);
      return { 
        success: false, 
        message: 'Network error - please check your connection and ensure the backend server is running'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get redirect path based on user role
  const getRedirectPath = (role) => {
    switch (role) {
      case 'ADMIN':
        return '/dashboard';
      case 'MANAGER':
        return '/projects';
      case 'EMPLOYEE':
        return '/tasks';
      default:
        return '/dashboard';
    }
  };

  // Enhanced logout - use window.location instead of navigate
  const logout = async (isSessionTimeout = false) => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        await apiCall(API_ROUTES.LOGOUT, {
          method: 'POST'
        });
      }
    } catch (error) {
      debugLog('Logout error:', error);
    } finally {
      clearAuthData();
      
      if (isSessionTimeout) {
        debugLog('User session expired');
      } else {
        debugLog('User logged out');
      }
      
      // Use window.location for navigation since we're outside router context
      window.location.href = '/login';
    }
  };

  // ... rest of your existing methods (changePassword, updateUser, hasRole, etc.)
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await apiCall(API_ROUTES.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.success) {
        return { 
          success: true, 
          message: response.data.message || 'Password changed successfully' 
        };
      } else {
        return { 
          success: false, 
          message: response.message || 'Failed to change password' 
        };
      }
    } catch (error) {
      debugLog('Change password error:', error);
      return { 
        success: false, 
        message: getErrorMessage(error) || 'Network error - please check your connection'
      };
    }
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (requiredRole) => {
    if (!user || !user.role) return false;
    
    const roleHierarchy = {
      'ADMIN': 3,
      'MANAGER': 2,
      'EMPLOYEE': 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    const permissions = {
      'ADMIN': [
        'manage_users', 'manage_projects', 'manage_tasks', 
        'view_all_data', 'delete_files', 'system_settings',
        'create_projects', 'assign_tasks', 'view_team_data', 
        'manage_team_files', 'view_own_tasks', 'update_task_status', 
        'upload_files'
      ],
      'MANAGER': [
        'create_projects', 'assign_tasks', 'view_team_data', 
        'manage_team_files', 'view_own_tasks', 'update_task_status', 
        'upload_files'
      ],
      'EMPLOYEE': [
        'view_own_tasks', 'update_task_status', 'upload_files'
      ]
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
  };

  const canAccessResource = (resource, action, targetUserId = null) => {
    if (!user) return false;
    
    if (user.role === 'ADMIN') return true;
    
    switch (resource) {
      case 'user_profile':
        if (action === 'edit' && targetUserId) {
          return user.user_id === parseInt(targetUserId) || hasRole('MANAGER');
        }
        return hasPermission('view_team_data');
        
      case 'task':
        if (action === 'assign') {
          return hasRole('MANAGER');
        }
        if (action === 'edit' && targetUserId) {
          return user.user_id === parseInt(targetUserId) || hasRole('MANAGER');
        }
        return hasPermission('view_own_tasks');
        
      case 'project':
        if (action === 'create' || action === 'edit') {
          return hasRole('MANAGER');
        }
        return hasPermission('view_team_data');
        
      default:
        return false;
    }
  };

  // Activity tracking for session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => resetSessionTimeout();
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, resetSessionTimeout]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    changePassword,
    hasRole,
    hasPermission,
    canAccessResource,
    checkAuthStatus,
    resetSessionTimeout,
    apiCall,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};