import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Paperclip,
  MessageSquare,
  Flag,
  Users,
  Grid3X3,
  Download,
  SortAsc,
  ChevronDown,
  X,
  PlayCircle,
  PauseCircle,
  FileText,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  XCircle
} from 'lucide-react';

// Import components
import CreateTaskModal from '../components/task/CreateTaskModal';
import UpdateTaskModal from '../components/task/UpdateTaskModal';
import ReviewApprovalSection from '../components/task/ReviewApprovalSection';
import useTasks from '../hooks/useTasks';
import { apiClient } from '../configApi';

// Service Classes
class ProjectService {
  static async getAllProjects() {
    try {
      const response = await apiClient.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }
}

class UserService {
  static async getAllUsers() {
    try {
      const response = await apiClient.get('/auth/users/assignable');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
}

function TasksPage() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [draggedTask, setDraggedTask] = useState(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Data state
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [taskStats, setTaskStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prevent duplicate requests
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  const updateTimeoutRef = useRef({});

  // Hooks
  const {
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    fetchTasks,
    fetchTaskStats
  } = useTasks();

  // Task Status mapping (Backend → Frontend)
  const taskStatuses = {
    'TODO': 'TO_DO',
    'INPROGRESS': 'IN_PROGRESS',
    'REVIEW': 'REVIEW',
    'DONE': 'DONE'
  };

  // Reverse mapping (Frontend → Backend)
  const reverseTaskStatuses = {
    'TO_DO': 'TODO',
    'IN_PROGRESS': 'INPROGRESS',
    'REVIEW': 'REVIEW',
    'DONE': 'DONE'
  };

  // Columns configuration
  const columns = [
    { id: 'TO_DO', title: 'To Do', color: 'gray' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'blue' },
    { id: 'REVIEW', title: 'Review', color: 'yellow' },
    { id: 'DONE', title: 'Done', color: 'green' }
  ];

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load data when filters change
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [selectedProject, selectedAssignee, selectedPriority, currentUser]);

  // Load current user data
  const loadCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        const user = response.data.data.user;
        setCurrentUser({
          ...user,
          userId: user.user_id || user.userId || user.id
        });
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      setError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  // Check if user is manager
  const isManager = () => {
    return currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  };

  // Check if user can edit task
  const canEditTask = (task) => {
    if (isManager()) return true;
    return task.assigneeId === currentUser?.userId;
  };

  // Check if user can delete task
  const canDeleteTask = () => {
    return isManager();
  };

  // ✅ ฟังก์ชันตรวจสอบว่า Employee สามารถย้าย task ไป status ไหนได้บ้าง
  const getEmployeeAllowedTransitions = (currentStatus) => {
    // Employee ทำได้เฉพาะ:
    // TO_DO → IN_PROGRESS (ผ่านปุ่ม "รับทราบและเริ่มทำงาน")
    // IN_PROGRESS → REVIEW (ผ่านปุ่ม "ส่งงานเพื่อรีวิว")
    // ห้ามย้ายไป DONE (ต้อง Manager approve)
    // ห้ามแตะ REVIEW column (ต้อง Manager approve/reject)
    switch (currentStatus) {
      case 'TO_DO': return ['IN_PROGRESS'];
      case 'IN_PROGRESS': return ['REVIEW'];
      default: return [];
    }
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (selectedProject !== 'all') filters.project_id = selectedProject;
      if (selectedAssignee !== 'all') filters.assigned_to = selectedAssignee;
      if (selectedPriority !== 'all') filters.priority = selectedPriority;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const [tasksResponse, projectsResponse, usersResponse, statsResponse] = await Promise.all([
        fetchTasks(filters),
        ProjectService.getAllProjects(),
        UserService.getAllUsers(),
        fetchTaskStats(filters)
      ]);

      if (tasksResponse.success) {
        const rawTasks = tasksResponse.data?.tasks || tasksResponse.data || [];
        const transformedTasks = rawTasks.map(task => ({
          id: task.task_id || task.id,
          title: task.task_title || task.title,
          description: task.task_description || task.description,
          project: task.project_name || task.project,
          projectId: task.project_id,
          assignee: task.assigned_to_name || task.assignee || 'Unassigned',
          assigneeId: task.assigned_to,
          assigneeAvatar: '/api/placeholder/32/32',
          priority: task.priority,
          status: taskStatuses[task.status] || task.status,
          dueDate: task.due_date,
          createdDate: task.created_at,
          estimatedHours: task.estimated_hours || 0,
          actualHours: task.actual_hours || 0,
          attachments: task.attachment_count || 0,
          comments: task.comment_count || 0,
          tags: task.tags || [],
          progress: task.estimated_hours && task.actual_hours 
            ? Math.min((task.actual_hours / task.estimated_hours) * 100, 100) 
            : 0
        }));
        setTasks(transformedTasks);
      } else {
        setTasks([]);
        setError(tasksResponse.message);
      }

      if (projectsResponse.success) {
        const rawProjects = projectsResponse.data?.projects || projectsResponse.data || [];
        const transformedProjects = [
          { id: 'all', name: 'All Projects' },
          ...rawProjects.map(project => ({
            id: project.project_id || project.id,
            name: project.project_name || project.name
          }))
        ];
        setProjects(transformedProjects);
      } else {
        setProjects([{ id: 'all', name: 'All Projects' }]);
      }

      if (usersResponse.success) {
        const rawUsers = usersResponse.data?.users || usersResponse.data || [];
        const transformedUsers = rawUsers.map(user => ({
          userId: user.user_id || user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          email: user.email
        }));
        setUsers(transformedUsers);
      } else {
        setUsers([]);
      }

      if (statsResponse.success) {
        setTaskStats(statsResponse.data || {});
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle create task
  const handleCreateTask = () => {
    setIsCreateModalOpen(true);
  };

  // Handle edit task
  const handleEditTask = (task) => {
    if (!canEditTask(task)) {
      alert('คุณไม่มีสิทธิ์แก้ไขงานนี้\nเฉพาะผู้รับผิดชอบหรือ Manager เท่านั้นที่สามารถแก้ไขได้');
      return;
    }
    setEditingTask(task);
    setIsUpdateModalOpen(true);
  };

  // Handle create form submission + file upload
  const handleCreateFormSubmit = async (formData) => {
    const taskPayload = {
      task_title: formData.task_title,
      task_description: formData.task_description,
      project_id: formData.project_id,
      assigned_to: formData.assigned_to,
      priority: formData.priority,
      due_date: formData.due_date,
      estimated_hours: formData.estimated_hours,
    };

    const result = await createTask(taskPayload);

    if (result.success) {
      const taskId = result.data?.task?.task_id || result.data?.task_id || result.data?.id;

      // Upload files if any
      if (taskId && formData.files && formData.files.length > 0) {
        for (const file of formData.files) {
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          fileFormData.append('related_type', 'task');
          fileFormData.append('related_id', String(taskId));

          try {
            await apiClient.post('/files/upload', fileFormData);
          } catch (err) {
            console.error('File upload error:', err);
          }
        }
      }

      await loadData();
      setIsCreateModalOpen(false);
    }

    return result;
  };

  // Handle update form submission
  const handleUpdateFormSubmit = async (formData) => {
    const result = await updateTask(editingTask.id, formData);
    
    if (result.success) {
      await loadData();
      setIsUpdateModalOpen(false);
      setEditingTask(null);
    }

    return result;
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId, taskTitle) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!canDeleteTask(task)) {
      alert('คุณไม่มีสิทธิ์ลบงานนี้\nเฉพาะ Manager เท่านั้นที่สามารถลบงานได้');
      return;
    }
    
    const result = await deleteTask(taskId, taskTitle);
    
    if (result.success) {
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    }
  };

  // ✅ Helper: Mark task as updating with auto-cleanup
  const withUpdatingGuard = async (taskId, fn) => {
    if (updatingTasks.has(taskId)) return;

    try {
      setUpdatingTasks(prev => new Set(prev).add(taskId));
      await fn();
    } finally {
      setTimeout(() => {
        setUpdatingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 1000);
    }
  };

  // Handle task status update with protection (for drag & drop)
  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    if (updatingTasks.has(taskId)) {
      console.log('Task is already being updated, skipping...');
      return;
    }

    if (updateTimeoutRef.current[taskId]) {
      clearTimeout(updateTimeoutRef.current[taskId]);
      delete updateTimeoutRef.current[taskId];
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // ====== EMPLOYEE RESTRICTIONS ======
      if (!isManager()) {
        // Employee ห้ามแตะ task ที่อยู่ใน REVIEW
        if (task.status === 'REVIEW') {
          alert('งานที่อยู่ในสถานะ REVIEW ต้องได้รับการอนุมัติหรือปฏิเสธจาก Manager เท่านั้น');
          return;
        }

        // Employee ห้ามย้ายไป DONE ตรงๆ
        if (newStatus === 'DONE') {
          alert('เฉพาะ Manager เท่านั้นที่สามารถอนุมัติงานให้เสร็จสิ้นได้');
          return;
        }

        // Employee ห้ามย้าย task ที่ไม่ใช่ของตัวเอง
        if (task.assigneeId !== currentUser?.userId) {
          alert('คุณสามารถย้ายได้เฉพาะงานที่ได้รับมอบหมายให้คุณเท่านั้น');
          return;
        }

        // Employee ย้ายได้ตาม flow เท่านั้น
        const allowed = getEmployeeAllowedTransitions(task.status);
        if (!allowed.includes(newStatus)) {
          alert('คุณไม่สามารถย้ายงานไปสถานะนี้ได้\nกรุณาใช้ปุ่มดำเนินการที่แสดงบนการ์ดงาน');
          return;
        }
      }

      // ====== MANAGER RESTRICTIONS ======
      if (isManager()) {
        // Manager: DONE ต้องผ่าน REVIEW ก่อน
        if (newStatus === 'DONE' && task.status !== 'REVIEW') {
          alert('งานต้องผ่านการรีวิวก่อนจึงจะเสร็จสิ้นได้\nกรุณาส่งงานไปที่ REVIEW ก่อน');
          return;
        }
      }

      // Mark as updating
      setUpdatingTasks(prev => new Set(prev).add(taskId));

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      );

      const backendStatus = reverseTaskStatuses[newStatus] || newStatus;
      const result = await updateTaskStatus(taskId, backendStatus);
      
      if (result.success) {
        if (newStatus === 'REVIEW') {
          await sendReviewNotification(task);
        }
      } else {
        setTasks(previousTasks);
        if (result.message) {
          setError(result.message);
          alert('ไม่สามารถอัพเดทสถานะได้: ' + result.message);
        }
      }
      
    } catch (err) {
      console.error('Error updating task status:', err);
      
      if (err.response?.status === 429) {
        alert('กรุณารอสักครู่ก่อนทำรายการอีกครั้ง');
      } else {
        setError('Failed to update task status');
      }
      
      await loadData();
    } finally {
      updateTimeoutRef.current[taskId] = setTimeout(() => {
        setUpdatingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        delete updateTimeoutRef.current[taskId];
      }, 1000);
    }
  };

  // Handle acknowledge and start task (Employee: TO_DO → IN_PROGRESS)
  const handleAcknowledgeTask = async (taskId) => {
    await withUpdatingGuard(taskId, async () => {
      try {
        const result = await updateTaskStatus(taskId, 'INPROGRESS');
        
        if (result.success) {
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId ? { ...task, status: 'IN_PROGRESS' } : task
            )
          );

          const task = tasks.find(t => t.id === taskId);
          if (task) await sendAcknowledgmentNotification(task);

          alert('รับทราบงานและเริ่มดำเนินการแล้ว');
        } else {
          alert('ไม่สามารถรับทราบงานได้: ' + result.message);
        }
      } catch (error) {
        console.error('Error acknowledging task:', error);
        alert(error.response?.status === 429 
          ? 'กรุณารอสักครู่ก่อนทำรายการอีกครั้ง'
          : 'เกิดข้อผิดพลาดในการรับทราบงาน');
      }
    });
  };

  // Handle submit for review (Employee: IN_PROGRESS → REVIEW)
  const handleSubmitForReview = async (taskId) => {
    const confirmed = window.confirm(
      'คุณต้องการส่งงานเพื่อรีวิวใช่หรือไม่?\n\nงานจะถูกส่งไปยัง Manager เพื่อตรวจสอบและอนุมัติ'
    );
    if (!confirmed) return;

    await withUpdatingGuard(taskId, async () => {
      try {
        const result = await updateTaskStatus(taskId, 'REVIEW');
        
        if (result.success) {
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId ? { ...task, status: 'REVIEW' } : task
            )
          );

          const task = tasks.find(t => t.id === taskId);
          if (task) await sendReviewNotification(task);

          alert('ส่งงานเพื่อรีวิวสำเร็จ\nManager จะได้รับการแจ้งเตือน');
        } else {
          alert('ไม่สามารถส่งงานเพื่อรีวิวได้: ' + result.message);
        }
      } catch (error) {
        console.error('Error submitting for review:', error);
        alert(error.response?.status === 429
          ? 'กรุณารอสักครู่ก่อนทำรายการอีกครั้ง'
          : 'เกิดข้อผิดพลาดในการส่งงานเพื่อรีวิว');
      }
    });
  };

  // ✅ Handle approve task (Manager: REVIEW → DONE)
  const handleApproveTask = async (taskId) => {
    await withUpdatingGuard(taskId, async () => {
      try {
        const result = await updateTaskStatus(taskId, 'DONE');
        
        if (result.success) {
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId ? { ...task, status: 'DONE' } : task
            )
          );

          const task = tasks.find(t => t.id === taskId);
          if (task && task.assigneeId) {
            await sendApprovalNotification(task, 'approved');
          }

          alert('อนุมัติงานสำเร็จ');
        } else {
          alert('ไม่สามารถอนุมัติงานได้: ' + result.message);
        }
      } catch (error) {
        console.error('Error approving task:', error);
        alert(error.response?.status === 429
          ? 'กรุณารอสักครู่ก่อนทำรายการอีกครั้ง'
          : 'เกิดข้อผิดพลาดในการอนุมัติงาน');
      }
    });
  };

  // ✅ FIX: Handle reject task (Manager: REVIEW → IN_PROGRESS)
  const handleRejectTask = async (taskId, reason) => {
    await withUpdatingGuard(taskId, async () => {
      try {
        // ✅ FIX: ส่ง 'IN_PROGRESS' ไม่ใช่ 'INPROGRESS'
        // เพราะ backend TaskStatus enum ใช้ 'IN_PROGRESS'
        const result = await updateTaskStatus(taskId, 'IN_PROGRESS');
        
        if (result.success) {
          // เพิ่ม comment เหตุผลที่ reject
          try {
            await addTaskComment(taskId, {
              comment_text: `งานถูกปฏิเสธ\n\nเหตุผล: ${reason}`,
              comment_type: 'REJECTION'
            });
          } catch (commentErr) {
            console.error('Error adding rejection comment:', commentErr);
            // ไม่ block flow หลัก — comment ไม่สำเร็จไม่เป็นไร
          }

          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'IN_PROGRESS', comments: task.comments + 1 }
                : task
            )
          );

          const task = tasks.find(t => t.id === taskId);
          if (task && task.assigneeId) {
            await sendApprovalNotification(task, 'rejected', reason);
          }

          alert('ส่งข้อเสนอแนะให้ผู้รับผิดชอบแล้ว');
        } else {
          alert('ไม่สามารถปฏิเสธงานได้: ' + result.message);
        }
      } catch (error) {
        console.error('Error rejecting task:', error);
        alert(error.response?.status === 429
          ? 'กรุณารอสักครู่ก่อนทำรายการอีกครั้ง'
          : 'เกิดข้อผิดพลาดในการปฏิเสธงาน');
      }
    });
  };

  // Add task comment
  const addTaskComment = async (taskId, commentData) => {
    try {
      const response = await apiClient.post(`/tasks/${taskId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  // Send acknowledgment notification
  const sendAcknowledgmentNotification = async (task) => {
    try {
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project?.name || 'โครงการ';

      await apiClient.post('/notifications/task-notification', {
        type: 'TASK_ACKNOWLEDGED',
        title: 'มีการรับทราบงาน',
        message: `${currentUser?.first_name} ${currentUser?.last_name} ได้รับทราบและเริ่มทำงาน "${task.title}" ในโครงการ "${projectName}" แล้ว`,
        related_id: task.id,
        related_type: 'task',
        priority: 'MEDIUM',
        send_email: false
      });
    } catch (error) {
      console.error('Error sending acknowledgment notification:', error);
    }
  };

  // Send review notification
  const sendReviewNotification = async (task) => {
    try {
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project?.name || 'โครงการ';

      await apiClient.post('/notifications/task-notification', {
        type: 'REVIEW_REQUEST',
        title: 'มีงานรอการรีวิว',
        message: `งาน "${task.title}" ในโครงการ "${projectName}" ต้องการการอนุมัติจากคุณ`,
        related_id: task.id,
        related_type: 'task',
        priority: task.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        send_email: true
      });
    } catch (error) {
      console.error('Error sending review notification:', error);
    }
  };

  // Send approval notification
  const sendApprovalNotification = async (task, action, reason = '') => {
    try {
      await apiClient.post('/notifications/task-notification', {
        user_id: task.assigneeId,
        type: action === 'approved' ? 'TASK_APPROVED' : 'TASK_REJECTED',
        title: action === 'approved' ? 'งานได้รับการอนุมัติ' : 'งานต้องแก้ไข',
        message: action === 'approved' 
          ? `งาน "${task.title}" ได้รับการอนุมัติแล้ว`
          : `งาน "${task.title}" ต้องแก้ไข: ${reason}`,
        related_id: task.id,
        related_type: 'task',
        priority: action === 'rejected' ? 'HIGH' : 'MEDIUM',
        send_email: true
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Handle search with debounce
  const handleSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 500),
    []
  );

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ✅ FIX: Drag and drop — Employee restrictions
  const handleDragStart = (e, task) => {
    // ห้าม drag task ที่อยู่ใน REVIEW (ทุก role)
    if (task.status === 'REVIEW') {
      e.preventDefault();
      alert('งานที่อยู่ในสถานะ REVIEW ต้องใช้ปุ่มอนุมัติ/ปฏิเสธเท่านั้น');
      return;
    }

    // ห้าม drag task ที่อยู่ใน DONE (เสร็จแล้ว)
    if (task.status === 'DONE') {
      e.preventDefault();
      return;
    }

    // Employee: ห้าม drag task ที่ไม่ใช่ของตัวเอง
    if (!isManager() && task.assigneeId !== currentUser?.userId) {
      e.preventDefault();
      alert('คุณสามารถย้ายได้เฉพาะงานที่ได้รับมอบหมายให้คุณเท่านั้น');
      return;
    }

    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    // ป้องกันย้ายไป column เดิม
    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // ====== EMPLOYEE DROP RESTRICTIONS ======
    if (!isManager()) {
      const allowed = getEmployeeAllowedTransitions(draggedTask.status);
      if (!allowed.includes(newStatus)) {
        if (newStatus === 'REVIEW') {
          alert('กรุณาใช้ปุ่ม "ส่งงานเพื่อรีวิว" บนการ์ดงานแทนการลาก');
        } else if (newStatus === 'DONE') {
          alert('เฉพาะ Manager เท่านั้นที่สามารถอนุมัติงานให้เสร็จสิ้นได้');
        } else {
          alert('คุณไม่สามารถย้ายงานไปสถานะนี้ได้');
        }
        setDraggedTask(null);
        return;
      }
    }

    // ====== MANAGER DROP RESTRICTIONS ======
    if (isManager()) {
      if (newStatus === 'DONE' && draggedTask.status !== 'REVIEW') {
        alert('งานต้องผ่านการรีวิวก่อนจึงจะเสร็จสิ้นได้\nกรุณาส่งงานไปที่ REVIEW ก่อน');
        setDraggedTask(null);
        return;
      }
    }

    await handleTaskStatusUpdate(draggedTask.id, newStatus);
    setDraggedTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
                         task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Get column count
  const getColumnCount = (columnId) => {
    return filteredTasks.filter(task => task.status === columnId).length;
  };

  // Utility functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isTaskUpdating = (taskId) => {
    return updatingTasks.has(taskId);
  };

  // Task Card Component
  const TaskCard = ({ task }) => {
    const taskUpdating = isTaskUpdating(task.id);
    const isMyTask = task.assigneeId === currentUser?.userId;
    
    // ✅ Employee: ห้าม drag task ที่อยู่ใน REVIEW, DONE, หรือไม่ใช่ของตัวเอง
    const canDrag = !taskUpdating && 
                    task.status !== 'REVIEW' && 
                    task.status !== 'DONE' &&
                    (isManager() || isMyTask);
    
    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, task)}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group mb-3 ${
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${
          isOverdue(task.dueDate) && task.status !== 'DONE' ? 'border-l-4 border-l-red-500' : ''
        } ${task.status === 'REVIEW' ? 'border-l-4 border-l-yellow-500' : ''
        } ${taskUpdating ? 'opacity-60' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {task.title}
            </h3>
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} title={task.priority}></div>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              {canEditTask(task) && (
                <button 
                  onClick={() => handleEditTask(task)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-all"
                  title="Edit task"
                  disabled={taskUpdating}
                >
                  <Edit className="w-3 h-3" />
                </button>
              )}
              {canDeleteTask(task) && (
                <button 
                  onClick={() => handleDeleteTask(task.id, task.title)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-all"
                  title="Delete task"
                  disabled={isLoading || taskUpdating}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Project Tag */}
        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
            {task.project}
          </span>
        </div>

        {/* Progress Bar */}
        {task.status === 'IN_PROGRESS' && task.progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(task.progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Due Date */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className={`${isOverdue(task.dueDate) && task.status !== 'DONE' ? 'text-red-600 font-medium' : ''}`}>
              {task.dueDate ? (
                isOverdue(task.dueDate) && task.status !== 'DONE' ? 'Overdue' : 
                getDaysRemaining(task.dueDate) === 0 ? 'Due today' :
                getDaysRemaining(task.dueDate) === 1 ? 'Due tomorrow' :
                getDaysRemaining(task.dueDate) > 0 ? `${getDaysRemaining(task.dueDate)} days left` :
                `${Math.abs(getDaysRemaining(task.dueDate))} days overdue`
              ) : 'No due date'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{task.actualHours}h / {task.estimatedHours}h</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {task.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments}</span>
              </div>
            )}
            {task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityTextColor(task.priority)}`}>
              {task.priority}
            </span>
            
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {task.assignee.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Employee Action Buttons — เฉพาะ task ที่ assign ให้ตัวเอง */}
        {isMyTask && !isManager() && (
          <>
            {/* TO_DO → รับทราบและเริ่มทำงาน */}
            {task.status === 'TO_DO' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleAcknowledgeTask(task.id)}
                  disabled={isLoading || taskUpdating}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      รับทราบและเริ่มทำงาน
                    </>
                  )}
                </button>
              </div>
            )}

            {/* IN_PROGRESS → ส่งรีวิว */}
            {task.status === 'IN_PROGRESS' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-3">คุณกำลังทำงานนี้อยู่</p>
                <button
                  onClick={() => handleSubmitForReview(task.id)}
                  disabled={isLoading || taskUpdating}
                  className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังส่งรีวิว...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      ส่งงานเพื่อรีวิว
                    </>
                  )}
                </button>
              </div>
            )}

            {/* REVIEW → แสดงสถานะรอรีวิว */}
            {task.status === 'REVIEW' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">กำลังรอ Manager รีวิวงาน...</span>
                </div>
              </div>
            )}

            {/* DONE → แสดงสถานะเสร็จสิ้น */}
            {task.status === 'DONE' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">งานเสร็จสิ้นแล้ว</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ✅ Review/Approval Section — Manager เท่านั้น */}
        {isManager() && (
          <ReviewApprovalSection
            task={task}
            currentUser={currentUser}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
            isLoading={isLoading || taskUpdating}
          />
        )}
      </div>
    );
  };

  // Kanban Column Component
  const KanbanColumn = ({ column, tasks }) => (
    <div className="bg-gray-50 rounded-lg p-4 min-h-[600px] flex-1 min-w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-${column.color}-500`}></div>
          <h3 className="font-medium text-gray-900">{column.title}</h3>
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
            {getColumnCount(column.id)}
          </span>
        </div>
        {isManager() && (
          <button 
            onClick={handleCreateTask}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column.id)}
        className="space-y-3 min-h-[500px]"
      >
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Tasks</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600 mt-1">จัดการและติดตาม tasks ด้วย Kanban board</p>
              {currentUser && (
                <p className="text-sm text-gray-500 mt-1">
                  สวัสดี {currentUser.first_name} {currentUser.last_name} 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {currentUser.role}
                  </span>
                </p>
              )}
              {error && (
                <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
                  {error}
                </div>
              )}
            </div>
            <button 
              onClick={handleCreateTask}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              สร้าง Task ใหม่
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหา tasks..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>

              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">ผู้รับผิดชอบทั้งหมด</option>
                {users.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">ความสำคัญทั้งหมด</option>
                <option value="CRITICAL">วิกฤต</option>
                <option value="HIGH">สูง</option>
                <option value="MEDIUM">ปานกลาง</option>
                <option value="LOW">ต่ำ</option>
              </select>

              <button 
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredTasks.filter(t => t.status === 'IN_PROGRESS').length}
                </p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">รอการรีวิว</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredTasks.filter(t => t.status === 'REVIEW').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredTasks.filter(t => t.status === 'DONE').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เกินกำหนด</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'DONE').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={filteredTasks.filter(task => task.status === column.id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <Grid3X3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบ task</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedPriority !== 'all' 
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองที่ใช้' 
                : 'เริ่มต้นด้วยการสร้าง task แรกของคุณ'}
            </p>
            <button 
              onClick={handleCreateTask}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              สร้าง Task ใหม่
            </button>
          </div>
        )}

        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateFormSubmit}
          projects={projects}
          users={users}
          isLoading={isLoading}
        />

        <UpdateTaskModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateFormSubmit}
          task={editingTask}
          projects={projects}
          users={users}
          isLoading={isLoading}
        />

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-700">กำลังประมวลผล...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksPage;