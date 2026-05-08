import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  Calendar, 
  Users, 
  TrendingUp, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Loader2,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';

import ProjectFormModal from '../components/project/ProjectFormModal';
import useProjects from '../hooks/useProjects';

const ProjectsPage = () => {
  // State management
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState('grid');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  // Hooks
  const {
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    fetchUsers
  } = useProjects();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingPage(true);
    try {
      // Load projects and users simultaneously
      const [projectsResult, usersResult] = await Promise.all([
        fetchProjects(),
        fetchUsers()
      ]);

      console.log('Projects Result:', projectsResult); // Debug log

      if (projectsResult.success) {
        // Ensure projects is always an array
        const projectsData = Array.isArray(projectsResult.data) ? projectsResult.data : [];
        setProjects(projectsData);
        console.log('Set projects:', projectsData); // Debug log
      } else {
        setError(projectsResult.message);
        setProjects([]); // Set empty array on error
      }

      if (usersResult.success) {
        const usersData = Array.isArray(usersResult.data) ? usersResult.data : [];
        setUsers(usersData);
      } else {
        setUsers([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Load initial data error:', error);
      setError('Failed to load data');
      setProjects([]); // Set empty array on error
      setUsers([]);
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Refresh projects
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchProjects(true);
      console.log('Refresh Result:', result); // Debug log
      
      if (result.success) {
        const projectsData = Array.isArray(result.data) ? result.data : [];
        setProjects(projectsData);
        setError(null);
      } else {
        setError(result.message);
        setProjects([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh projects');
      setProjects([]); // Set empty array on error
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle create project
  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  // Handle edit project
  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    let result;
    
    if (editingProject) {
      // Update existing project
      result = await updateProject(editingProject.project_id, formData);
      if (result.success) {
        setProjects(prev => {
          const updatedProjects = Array.isArray(prev) ? prev.map(p => 
            p.project_id === editingProject.project_id 
              ? { ...p, ...result.data } 
              : p
          ) : [];
          return updatedProjects;
        });
      }
    } else {
      // Create new project
      result = await createProject(formData);
      if (result.success) {
        setProjects(prev => {
          const currentProjects = Array.isArray(prev) ? prev : [];
          return [result.data, ...currentProjects];
        });
      }
    }

    if (result.success) {
      setIsModalOpen(false);
      setEditingProject(null);
    }

    return result;
  };

  // Handle delete project
  const handleDeleteProject = async (projectId, projectName) => {
    const result = await deleteProject(projectId, projectName);
    
    if (result.success) {
      setProjects(prev => {
        const currentProjects = Array.isArray(prev) ? prev : [];
        return currentProjects.filter(p => p.project_id !== projectId);
      });
    }
  };

  // Filter and search projects
  const filteredProjects = Array.isArray(projects) ? projects.filter(project => {
    // Search filter
    const matchesSearch = project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.leader_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter - ตรงกับ database schema
    switch (selectedFilter) {
      case 'active':
        return project.status === 'ACTIVE' || project.status === 'PLANNING';
      case 'completed':
        return project.status === 'COMPLETED';
      case 'starred':
        return project.is_starred;
      default:
        return true;
    }
  }) : [];

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.project_name.localeCompare(b.project_name);
      case 'progress':
        return (b.progress || 0) - (a.progress || 0);
      case 'deadline':
        if (!a.end_date && !b.end_date) return 0;
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(a.end_date) - new Date(b.end_date);
      default: // 'updated'
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    }
  });

  // Get status display info - ตรงกับ database schema
  const getStatusInfo = (status) => {
    const statusMap = {
      PLANNING: { label: 'วางแผน', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' },
      ACTIVE: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400' },
      ON_HOLD: { label: 'พักชั่วคราว', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
      COMPLETED: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-800', dot: 'bg-green-400' },
      CANCELLED: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800', dot: 'bg-red-400' }
    };
    return statusMap[status] || statusMap.PLANNING;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  // Format budget
  const formatBudget = (budget) => {
    if (!budget) return '-';
    return new Intl.NumberFormat('th-TH').format(budget) + ' บาท';
  };

  // Project Card Component
  const ProjectCard = ({ project }) => {
    const statusInfo = getStatusInfo(project.status);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {project.project_name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dot}`}></div>
                  {statusInfo.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEditProject(project)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="แก้ไขโครงการ"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteProject(project.project_id, project.project_name)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="ลบโครงการ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Project Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2" />
              <span>หัวหน้าโครงการ: {project.leader_name || 'ไม่ระบุ'}</span>
            </div>
            
            {project.end_date && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>กำหนดเสร็จ: {formatDate(project.end_date)}</span>
              </div>
            )}

            {project.budget && (
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>งบประมาณ: {formatBudget(project.budget)}</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
   
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>อัปเดตล่าสุด: {formatDate(project.updated_at || project.created_at)}</span>
            <button className="text-gray-400 hover:text-yellow-500 transition-colors">
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // List View Component
  const ProjectListItem = ({ project }) => {
    const statusInfo = getStatusInfo(project.status);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.project_name}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {project.description || 'ไม่มีรายละเอียด'}
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <div className="text-gray-500">หัวหน้าโครงการ</div>
                  <div className="font-medium">{project.leader_name || 'ไม่ระบุ'}</div>
                </div>
                
                <div className="text-sm">
                  <div className="text-gray-500">สถานะ</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dot}`}></div>
                    {statusInfo.label}
                  </span>
                </div>
                
                <div className="text-sm">
                  <div className="text-gray-500">ความคืบหน้า</div>
                  <div className="font-medium">{project.progress || 0}%</div>
                </div>
                
                <div className="text-sm">
                  <div className="text-gray-500">กำหนดเสร็จ</div>
                  <div className="font-medium">{formatDate(project.end_date)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEditProject(project)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="แก้ไขโครงการ"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteProject(project.project_id, project.project_name)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="ลบโครงการ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoadingPage) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">กำลังโหลดโครงการ</h3>
              <p className="text-gray-600">กรุณารอสักครู่...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (when no cached data)
  if (error && (!Array.isArray(projects) || projects.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาดในการโหลดโครงการ</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                ลองใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">โครงการ</h1>
              <p className="text-gray-600 mt-1">จัดการและติดตามโครงการทั้งหมดของคุณในที่เดียว</p>
              {error && (
                <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
                  ⚠️ {error} (แสดงข้อมูลที่เก็บไว้)
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="รีเฟรชโครงการ"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={handleCreateProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                สร้างโครงการใหม่
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาโครงการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Filter */}
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">โครงการทั้งหมด</option>
                <option value="active">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
                <option value="starred">โปรด</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="updated">อัปเดตล่าสุด</option>
                <option value="name">ชื่อ</option>
                <option value="progress">ความคืบหน้า</option>
                <option value="deadline">กำหนดเสร็จ</option>
              </select>

              {/* View Mode */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="มุมมองกริด"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="มุมมองรายการ"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Content */}
        {sortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Grid className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || selectedFilter !== 'all' 
                ? 'ไม่พบโครงการที่ตรงกับการค้นหา' 
                : 'ยังไม่มีโครงการ'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedFilter !== 'all'
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองที่ใช้'
                : 'เริ่มต้นด้วยการสร้างโครงการแรกของคุณ'
              }
            </p>
            {!searchQuery && selectedFilter === 'all' && (
              <button
                onClick={handleCreateProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                สร้างโครงการใหม่
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="mb-4 text-sm text-gray-600">
              แสดง {sortedProjects.length} โครงการ จากทั้งหมด {Array.isArray(projects) ? projects.length : 0} โครงการ
            </div>

            {/* Projects Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProjects.map(project => (
                  <ProjectCard key={project.project_id} project={project} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProjects.map(project => (
                  <ProjectListItem key={project.project_id} project={project} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Project Form Modal */}
        <ProjectFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={handleFormSubmit}
          project={editingProject}
          users={users}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default ProjectsPage;