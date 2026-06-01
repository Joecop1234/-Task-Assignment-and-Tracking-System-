// pages/UsersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  Crown,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Download,
  Shield,
  Activity,
  Loader2,
  RefreshCw,
  Ban,
  UserCheck,
  X,
  Save,
  ChevronDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import config, { apiClient } from '../configApi';
import Modal from '../components/common/Modal';

// ========== Form Input Component (อยู่นอก UsersPage เพื่อไม่ให้ re-create ทุก render) ==========
const FormInput = ({ label, name, type = 'text', value, onChange, error, required, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder || label}
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
      }`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

function UsersPage() {
  // ========== State ==========
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'EMPLOYEE',
    department: '',
    position: '',
    phone: ''
  });
  const [createErrors, setCreateErrors] = useState({});

  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'EMPLOYEE',
    department: '',
    position: '',
    phone: '',
    is_active: true
  });
  const [editErrors, setEditErrors] = useState({});

  // ========== Constants ==========
  const departments = [
    { id: 'all', name: 'All Departments' },
    { id: 'Engineering', name: 'Engineering' },
    { id: 'Design', name: 'Design' },
    { id: 'Quality Assurance', name: 'Quality Assurance' },
    { id: 'Marketing', name: 'Marketing' },
    { id: 'Sales', name: 'Sales' },
    { id: 'HR', name: 'Human Resources' },
    { id: 'Finance', name: 'Finance' }
  ];

  const roles = [
    { id: 'all', name: 'All Roles' },
    { id: 'ADMIN', name: 'Administrator' },
    { id: 'MANAGER', name: 'Manager' },
    { id: 'EMPLOYEE', name: 'Employee' }
  ];

  // ========== Auth Helpers ==========
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const canManageUsers = () => {
    const user = getCurrentUser();
    return user && user.role === 'ADMIN';
  };

  // ========== API Functions ==========
  const loadUsers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // แก้ endpoint ให้ตรงกับ backend จริง: /auth/admin/users
      const response = await apiClient.get('/auth/users');

      if (response.data.success) {
        const usersData = response.data.data.users || response.data.data || [];
        setUsers(usersData);
      } else {
        throw new Error(response.data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);

      let errorMessage = 'Failed to load users';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view users.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Create user via /auth/register endpoint
  const handleCreateUser = async () => {
    const errors = validateCreateForm();
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { confirmPassword, ...userData } = createForm;
      const response = await apiClient.post('/auth/register', userData);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
        setShowCreateModal(false);
        resetCreateForm();
        loadUsers(true);
      } else {
        throw new Error(response.data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const msg = error.response?.data?.message || 'ไม่สามารถเพิ่มผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update user status
  const updateUserStatus = async (userId, newStatus) => {
    const action = newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    const result = await Swal.fire({
      title: `ยืนยัน${action}ผู้ใช้`,
      text: `คุณต้องการ${action}ผู้ใช้นี้หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#22c55e' : '#f97316',
      confirmButtonText: `ใช่, ${action}`,
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiClient.put(`/auth/users/${userId}`, {
        is_active: newStatus
      });

      if (response.data.success) {
        setUsers(prev =>
          prev.map(user =>
            user.user_id === userId ? { ...user, is_active: newStatus } : user
          )
        );
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: `${action}ผู้ใช้เรียบร้อยแล้ว`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถอัปเดตสถานะได้' });
    }
  };

  // Delete user
  const deleteUser = async (userId, userName) => {
    const result = await Swal.fire({
      title: 'ยืนยันลบผู้ใช้',
      html: `คุณต้องการลบผู้ใช้ <strong>"${userName}"</strong> หรือไม่?<br><small class="text-red-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiClient.delete(`/auth/users/${userId}`);

      if (response.data.success) {
        setUsers(prev => prev.filter(user => user.user_id !== userId));
        Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ!',
          text: 'ลบผู้ใช้เรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบผู้ใช้ได้' });
    }
  };

  // ========== Form Helpers ==========
  const validateCreateForm = () => {
    const errors = {};
    if (!createForm.username.trim()) errors.username = 'กรุณากรอก Username';
    if (!createForm.email.trim()) errors.email = 'กรุณากรอก Email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errors.email = 'รูปแบบ Email ไม่ถูกต้อง';
    if (!createForm.password) errors.password = 'กรุณากรอก Password';
    else if (createForm.password.length < 8) errors.password = 'Password ต้องมีอย่างน้อย 8 ตัวอักษร';
    if (createForm.password !== createForm.confirmPassword) errors.confirmPassword = 'Password ไม่ตรงกัน';
    if (!createForm.first_name.trim()) errors.first_name = 'กรุณากรอกชื่อ';
    if (!createForm.last_name.trim()) errors.last_name = 'กรุณากรอกนามสกุล';
    return errors;
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      role: 'EMPLOYEE',
      department: '',
      position: '',
      phone: ''
    });
    setCreateErrors({});
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role || 'EMPLOYEE',
      department: user.department || '',
      position: user.position || '',
      phone: user.phone || '',
      is_active: user.is_active ?? true
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const openDetailModal = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // ========== Utility Functions ==========
  const getRoleIcon = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'MANAGER': return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDisplayName = (user) => {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    return user.username || 'Unknown User';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastSeen = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('th-TH');
  };

  // ========== Filtered Data ==========
  const filteredUsers = users.filter(user => {
    const displayName = getDisplayName(user);
    const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || user.department === selectedDepartment;
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const userStatus = user.is_active ? 'ACTIVE' : 'INACTIVE';
    const matchesStatus = selectedStatus === 'all' || userStatus === selectedStatus;
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const activeUsers = users.filter(u => u.is_active);
  const onlineUsers = users.filter(u => {
    if (!u.last_login) return false;
    return new Date(u.last_login) > new Date(Date.now() - 5 * 60 * 1000);
  });

  // ========== User List Item Component ==========
  const UserListItem = ({ user }) => {
    const displayName = getDisplayName(user);
    const isOnline = user.last_login &&
      new Date(user.last_login) > new Date(Date.now() - 5 * 60 * 1000);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Left - User info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{displayName}</h3>
                  {getRoleIcon(user.role)}
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(user.role)}`}>
                    {user.role || 'EMPLOYEE'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-medium">@{user.username}</span>
                  <span>{user.department || 'No Department'}</span>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Joined {formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle - Status */}
            <div className="hidden xl:flex items-center gap-8 px-4">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">{formatLastSeen(user.last_login)}</div>
                <div className="text-xs text-gray-500">Last seen</div>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold px-2 py-1 rounded ${
                  user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </div>
                <div className="text-xs text-gray-500">Status</div>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex gap-1">
              <button
                onClick={() => openDetailModal(user)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>

              {canManageUsers() && (
                <>
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit User"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteUser(user.user_id, displayName)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== Loading State ==========
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Users</h3>
              <p className="text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== Error State ==========
  if (error && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Users</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => loadUsers()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== Main Render ==========
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600 mt-1">Manage system users, roles, and permissions</p>
              {error && (
                <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
                  ⚠️ {error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadUsers(true)}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {canManageUsers() && (
                <button
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateModal(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                  <span className="text-green-600">System users</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
                <div className="flex items-center mt-2 text-sm">
                  <Activity className="w-4 h-4 mr-1 text-green-600" />
                  <span className="text-green-600">{onlineUsers.length} online now</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Administrators</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {users.filter(u => u.role === 'ADMIN').length}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  <Crown className="w-4 h-4 mr-1 text-yellow-600" />
                  <span className="text-yellow-600">System admins</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Online Now</p>
                <p className="text-3xl font-bold text-orange-600">{onlineUsers.length}</p>
                <div className="flex items-center mt-2 text-sm">
                  <Clock className="w-4 h-4 mr-1 text-orange-600" />
                  <span className="text-orange-600">Active sessions</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Export">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4 mb-8">
          {filteredUsers.map((user) => (
            <UserListItem key={user.user_id} user={user} />
          ))}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first user'}
            </p>
            {canManageUsers() && (
              <button
                onClick={() => {
                  resetCreateForm();
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add New User
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========== CREATE USER MODAL ========== */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="เพิ่มผู้ใช้ใหม่"
      >
        <div className="space-y-6">
          {/* Account Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              ข้อมูลบัญชี
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Username"
                name="username"
                value={createForm.username}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.username}
                required
                placeholder="ชื่อผู้ใช้"
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={createForm.email}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.email}
                required
                placeholder="email@example.com"
              />
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={createForm.password}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.password}
                required
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={createForm.confirmPassword}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.confirmPassword}
                required
                placeholder="ยืนยัน Password"
              />
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              ข้อมูลส่วนตัว
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="ชื่อ (First Name)"
                name="first_name"
                value={createForm.first_name}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.first_name}
                required
              />
              <FormInput
                label="นามสกุล (Last Name)"
                name="last_name"
                value={createForm.last_name}
                onChange={(name, val) => {
                  setCreateForm(prev => ({ ...prev, [name]: val }));
                  if (createErrors[name]) setCreateErrors(prev => ({ ...prev, [name]: '' }));
                }}
                error={createErrors.last_name}
                required
              />
              <FormInput
                label="เบอร์โทรศัพท์"
                name="phone"
                type="tel"
                value={createForm.phone}
                onChange={(name, val) => setCreateForm(prev => ({ ...prev, [name]: val }))}
                placeholder="0xx-xxx-xxxx"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Work Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              ข้อมูลการทำงาน
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แผนก (Department)</label>
                <select
                  value={createForm.department}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departments.filter(d => d.id !== 'all').map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <FormInput
                label="ตำแหน่ง (Position)"
                name="position"
                value={createForm.position}
                onChange={(name, val) => setCreateForm(prev => ({ ...prev, [name]: val }))}
                placeholder="เช่น Frontend Developer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreateUser}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  เพิ่มผู้ใช้
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== EDIT USER MODAL ========== */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`แก้ไขผู้ใช้: ${selectedUser ? getDisplayName(selectedUser) : ''}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="ชื่อ"
              name="first_name"
              value={editForm.first_name}
              onChange={(name, val) => setEditForm(prev => ({ ...prev, [name]: val }))}
              required
            />
            <FormInput
              label="นามสกุล"
              name="last_name"
              value={editForm.last_name}
              onChange={(name, val) => setEditForm(prev => ({ ...prev, [name]: val }))}
              required
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={editForm.email}
              onChange={(name, val) => setEditForm(prev => ({ ...prev, [name]: val }))}
              required
            />
            <FormInput
              label="เบอร์โทร"
              name="phone"
              type="tel"
              value={editForm.phone}
              onChange={(name, val) => setEditForm(prev => ({ ...prev, [name]: val }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">-- เลือกแผนก --</option>
                {departments.filter(d => d.id !== 'all').map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <FormInput
              label="ตำแหน่ง"
              name="position"
              value={editForm.position}
              onChange={(name, val) => setEditForm(prev => ({ ...prev, [name]: val }))}
            />
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                Active (เปิดใช้งาน)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              ยกเลิก
            </button>
            <button
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  const response = await apiClient.put(`/auth/users/${selectedUser.user_id}`, editForm);
                  if (response.data.success) {
                    Swal.fire({
                      icon: 'success',
                      title: 'สำเร็จ!',
                      text: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว',
                      timer: 1500,
                      showConfirmButton: false
                    });
                    setShowEditModal(false);
                    loadUsers(true);
                  }
                } catch (error) {
                  console.error('Failed to update user:', error);
                  Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถอัปเดตข้อมูลได้' });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== USER DETAIL MODAL ========== */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`รายละเอียดผู้ใช้: ${selectedUser ? getDisplayName(selectedUser) : ''}`}
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Avatar & Name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {getDisplayName(selectedUser).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{getDisplayName(selectedUser)}</h3>
                <p className="text-gray-600">@{selectedUser.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleIcon(selectedUser.role)}
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedUser.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium">{selectedUser.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium">{selectedUser.department || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="text-sm font-medium">{selectedUser.position || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Seen</p>
                  <p className="text-sm font-medium">{formatLastSeen(selectedUser.last_login)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default UsersPage;