// components/Layout/Nav.jsx - แก้ไขแล้ว
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home, 
  FolderKanban, 
  Users, 
  BarChart3, 
  FileText,
  ChevronDown,
  CheckCircle,
  Info,
  Clock,
  AlertCircle
} from 'lucide-react';
import config, { apiClient } from '../../configApi';

function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation items with role-based access
  const getNavItems = (userRole) => {
    const baseItems = [
      { name: 'Projects', icon: FolderKanban, href: '/projects', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Tasks', icon: FileText, href: '/tasks', roles: ['ADMIN', 'MANAGER'] },
     
      { name: 'Users', icon: Users, href: '/users', roles: ['ADMIN'] },
      { name: 'Reports', icon: BarChart3, href: '/reports', roles: ['ADMIN', 'MANAGER','EMPLOYEE'] },
      
    ];

    return baseItems
      .filter(item => item.roles.includes(userRole))
      .map(item => ({
        ...item,
        active: location.pathname === item.href || 
                (item.href === '/dashboard' && location.pathname === '/')
      }));
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_UPDATED':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'PROJECT_CREATED':
      case 'PROJECT_STATUS_UPDATED':
        return <Info className="w-4 h-4 text-purple-500" />;
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'SYSTEM_ANNOUNCEMENT':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format notification type for display
  const formatNotificationType = (type) => {
    const typeMap = {
      'TASK_ASSIGNED': 'มอบหมายงาน',
      'TASK_STATUS_UPDATED': 'อัพเดทงาน',
      'PROJECT_CREATED': 'สร้างโครงการ',
      'PROJECT_STATUS_UPDATED': 'อัพเดทโครงการ',
      'TASK_DUE_SOON': 'ใกล้กำหนดส่ง',
      'TASK_OVERDUE': 'เลยกำหนดส่ง',
      'SYSTEM_ANNOUNCEMENT': 'ประกาศระบบ'
    };
    return typeMap[type] || type;
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  // Load user data from localStorage first, then verify with API
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get user from localStorage first
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
          navigate('/login');
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);

        // Verify token and get fresh user data
        const response = await apiClient.get('/auth/me');
        
        if (response.data.success) {
          const freshUser = response.data.data.user || response.data.data;
          setCurrentUser(freshUser);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(freshUser));
        }

      } catch (error) {
        console.error('Failed to load user data:', error);
        
        // If token is invalid, logout
        if (error.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  // Load notifications and count
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Load unread count
        const countResponse = await apiClient.get('/notifications/unread-count');
        if (countResponse.data.success) {
          setNotificationCount(countResponse.data.data.count || 0);
        }

        // Load recent notifications (limit to 10 for dropdown)
        const notificationsResponse = await apiClient.get('/notifications?limit=10');
        if (notificationsResponse.data.success) {
          setNotifications(notificationsResponse.data.data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
        // Don't show error to user, just keep count at 0
      }
    };

    if (currentUser) {
      loadNotifications();
      
      // Poll for notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      // Call logout API
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear localStorage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };


  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const handleViewAllNotifications = () => {
    setIsNotificationOpen(false);
    navigate('/notifications');
  };

  const handleNavigation = (href) => {
    navigate(href);
    setIsMobileMenuOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown')) {
        setIsNotificationOpen(false);
      }
      if (!event.target.closest('.user-dropdown')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">TATS</h1>
                <p className="text-xs text-gray-500 -mt-1">Loading...</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full"></div>
          </div>
        </div>
      </nav>
    );
  }

  // Don't render if no user data
  if (!currentUser) {
    return null;
  }

  const navItems = getNavItems(currentUser.role);
  const displayName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">TATS</h1>
                <p className="text-xs text-gray-500 -mt-1">Task Assignment System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    item.active
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Notifications and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative notification-dropdown">
              <button
                onClick={handleNotificationClick}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={notificationCount > 0 ? `${notificationCount} unread notifications` : 'No new notifications'}
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem] h-5">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">แจ้งเตือน</h3>
                      <button
                        onClick={handleViewAllNotifications}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        ดูทั้งหมด
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">ไม่มีแจ้งเตือน</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                          <div
                            key={notification.notification_id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              !notification.is_read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {formatNotificationType(notification.type)}
                                  </span>
                                  {notification.priority === 'HIGH' && (
                                    <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-600 rounded">
                                      สำคัญ
                                    </span>
                                  )}
                                  {!notification.is_read && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatRelativeTime(notification.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative user-dropdown">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 text-sm rounded-lg p-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-medium text-gray-900">{displayName}</div>
                  <div className="text-xs text-gray-500 capitalize">{currentUser.role?.toLowerCase()}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-900 font-medium">{displayName}</p>
                    <p className="text-sm text-gray-500">{currentUser.email}</p>
                    <p className="text-xs text-gray-400 capitalize">{currentUser.role?.toLowerCase()}</p>
                  </div>
                  <div className="py-1">
                  
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="group flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="block h-5 w-5" />
              ) : (
                <Menu className="block h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-base font-medium transition-colors flex items-center space-x-3 ${
                  item.active
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-4 pb-3">
            <div className="px-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-base font-medium text-gray-800">{displayName}</div>
                <div className="text-sm text-gray-500 capitalize">{currentUser.role?.toLowerCase()}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/notifications');
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-between"
              >
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/profile');
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/settings');
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:text-red-900 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile dropdown */}
      {(isUserMenuOpen || isMobileMenuOpen || isNotificationOpen) && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
            setIsNotificationOpen(false);
          }}
        />
      )}
    </nav>
  );
}

export default Nav;