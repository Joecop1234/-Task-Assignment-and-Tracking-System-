import { useState, useCallback } from 'react';
import { apiClient, API_ROUTES, getErrorMessage } from '../configApi';
import Swal from 'sweetalert2';

const useProjects = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create new project
   const createProject = useCallback(async (projectData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Creating project with data:', projectData);
      
      const response = await apiClient.post('/projects', projectData);
      
      console.log('Create project response:', response.data);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'สร้างโครงการใหม่เรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Project created successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Create project error:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      // Show error message with more details
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage,
        footer: error.response?.status ? `HTTP ${error.response.status}` : '',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33'
      });
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Update existing project
  const updateProject = useCallback(async (projectId, projectData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Note: You need to create this endpoint in your backend
      const response = await apiClient.put(`/projects/${projectId}`, projectData);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'อัปเดตโครงการเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Project updated successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to update project');
      }
    } catch (error) {
      console.error('Update project error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      // Show error message
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33'
      });
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId, projectName) => {
    // Confirm deletion
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบโครงการ "${projectName}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) {
      return { success: false, cancelled: true };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Note: You need to create this endpoint in your backend
      const response = await apiClient.delete(`/projects/${projectId}`);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ!',
          text: `ลบโครงการ "${projectName}" เรียบร้อยแล้ว`,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true,
          message: 'Project deleted successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      // Show error message
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33'
      });
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get all projects
  const fetchProjects = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/projects', {
        params: { refresh: forceRefresh }
      });
      
      // Debug logs
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        // Handle the actual response structure from your backend
        let projectsData = [];
        
        if (response.data.data && Array.isArray(response.data.data.projects)) {
          // Your actual response structure: { data: { projects: [...] } }
          projectsData = response.data.data.projects;
        } else if (Array.isArray(response.data.data)) {
          // Fallback: direct array
          projectsData = response.data.data;
        }
        
        console.log('Projects Data:', projectsData);
        console.log('Number of projects:', projectsData.length);
        
        return { 
          success: true, 
          data: projectsData
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Fetch projects error:', error);
      console.error('Error Response:', error.response?.data);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage,
        data: []
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get project by ID
  const fetchProjectById = useCallback(async (projectId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Note: You need to create this endpoint in your backend
      const response = await apiClient.get(`/projects/${projectId}`);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Project not found');
      }
    } catch (error) {
      console.error('Fetch project error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update project status
  const updateProjectStatus = useCallback(async (projectId, status) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Note: You need to create this endpoint in your backend
      const response = await apiClient.put(`/projects/${projectId}/status`, { status });
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Failed to update project status');
      }
    } catch (error) {
      console.error('Update project status error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get users for project leader selection
  const fetchUsers = useCallback(async () => {
    try {
      // Use the existing admin users endpoint
      const response = await apiClient.get('/auth/users');
      
      if (response.data.success) {
        // Response structure: { success: true, data: { users: [...], count: N } }
        const users = response.data.data.users || [];
        // Filter only active users for project leader selection
        const activeUsers = users.filter(user => user.is_active);
        return { 
          success: true, 
          data: activeUsers
        };
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      // If user doesn't have admin permission, return empty array
      if (error.response?.status === 403) {
        console.warn('No admin permission to fetch users list');
        return { 
          success: true, 
          data: []
        };
      }
      return { 
        success: false, 
        data: []
      };
    }
  }, []);

  return {
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    fetchProjectById,
    updateProjectStatus,
    fetchUsers
  };
};

export default useProjects;

