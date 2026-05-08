import { useState, useCallback } from 'react';
import { apiClient, getErrorMessage } from '../configApi';
import Swal from 'sweetalert2';

const useTasks = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create new task
  const createTask = useCallback(async (taskData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Creating task with data:', taskData);
      
      const response = await apiClient.post('/tasks', taskData);
      
      console.log('Create task response:', response.data);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'สร้าง task ใหม่เรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Task created successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Create task error:', error);
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

  // Update existing task
  const updateTask = useCallback(async (taskId, taskData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Updating task:', { taskId, taskData });
      
      const response = await apiClient.put(`/tasks/${taskId}`, taskData);
      
      console.log('Update task response:', response.data);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'อัปเดต task เรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Task updated successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Update task error:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      // Show error message
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

  // Delete task
  const deleteTask = useCallback(async (taskId, taskTitle) => {
    // Confirm deletion
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบ task "${taskTitle}" หรือไม่?`,
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
      console.log('Deleting task:', taskId);
      
      const response = await apiClient.delete(`/tasks/${taskId}`);
      
      console.log('Delete task response:', response.data);
      
      if (response.data.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ!',
          text: `ลบ task "${taskTitle}" เรียบร้อยแล้ว`,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true,
          message: 'Task deleted successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
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

  // Update task status
  const updateTaskStatus = useCallback(async (taskId, status) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Updating task status:', { taskId, status });
      
        const response = await apiClient.put(`/tasks/${taskId}/status`, {
      status: status 
    });
      
      console.log('Update task status response:', response.data);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data,
          message: 'Task status updated successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to update task status');
      }
    } catch (error) {
      console.error('Update task status error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      // Don't show popup for status updates (too intrusive for drag & drop)
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Assign task to user
  const assignTask = useCallback(async (taskId, assignedTo) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Assigning task:', { taskId, assignedTo });
      
      const response = await apiClient.put(`/tasks/${taskId}/assign`, { assigned_to: assignedTo });
      
      console.log('Assign task response:', response.data);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data,
          message: 'Task assigned successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to assign task');
      }
    } catch (error) {
      console.error('Assign task error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get all tasks with filters
  const fetchTasks = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const url = `/tasks${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching tasks with filters:', filters);
      const response = await apiClient.get(url);
      
      console.log('Fetch tasks response:', response.data);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data || {}
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage,
        data: { tasks: [], total: 0 }
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get task by ID
  const fetchTaskById = useCallback(async (taskId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Task not found');
      }
    } catch (error) {
      console.error('Fetch task error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get my tasks
  const fetchMyTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/tasks/my/tasks');
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data || []
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch my tasks');
      }
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
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

  // Get task statistics
  const fetchTaskStats = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      
      const queryString = params.toString();
      const url = `/tasks/stats/overview${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data.data || {}
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch task stats');
      }
    } catch (error) {
      console.error('Fetch task stats error:', error);
      
      return { 
        success: false, 
        message: error.message,
        data: {}
      };
    }
  }, []);

  // Bulk update task status
  const bulkUpdateStatus = useCallback(async (taskIds, status) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Bulk updating status:', { taskIds, status });
      
      const response = await apiClient.put('/tasks/bulk/status', { 
        task_ids: taskIds, 
        status 
      });
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: `อัปเดตสถานะ ${taskIds.length} tasks เรียบร้อยแล้ว`,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Bulk status update successful'
        };
      } else {
        throw new Error(response.data.message || 'Failed to bulk update status');
      }
    } catch (error) {
      console.error('Bulk update status error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
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

  // Bulk assign tasks
  const bulkAssignTasks = useCallback(async (taskIds, assignedTo) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Bulk assigning tasks:', { taskIds, assignedTo });
      
      const response = await apiClient.put('/tasks/bulk/assign', { 
        task_ids: taskIds, 
        assigned_to: assignedTo 
      });
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: `มอบหมาย ${taskIds.length} tasks เรียบร้อยแล้ว`,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6'
        });
        
        return { 
          success: true, 
          data: response.data.data,
          message: 'Bulk assign successful'
        };
      } else {
        throw new Error(response.data.message || 'Failed to bulk assign tasks');
      }
    } catch (error) {
      console.error('Bulk assign tasks error:', error);
      
      const errorMessage = error.response?.data?.message || getErrorMessage(error);
      setError(errorMessage);
      
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

  return {
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    assignTask,
    fetchTasks,
    fetchTaskById,
    fetchMyTasks,
    fetchTaskStats,
    bulkUpdateStatus,
    bulkAssignTasks
  };
};

export default useTasks;