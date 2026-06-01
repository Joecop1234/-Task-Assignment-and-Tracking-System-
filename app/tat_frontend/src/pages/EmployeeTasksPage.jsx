import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Paperclip,
  MessageSquare,
  Grid3X3,
  PlayCircle,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Import components
import UpdateTaskModal from '../components/task/UpdateTaskModal';
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

function EmployeeTasksPage() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [draggedTask, setDraggedTask] = useState(null);
  
  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Data state
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prevent duplicate requests
  const [updatingTasks, setUpdatingTasks] = useState(new Set());
  const updateTimeoutRef = useRef({});

  // Hooks
  const {
    isLoading,
    updateTask,
    updateTaskStatus,
    fetchTasks,
  } = useTasks();

  // Task Status mapping
  const taskStatuses = {
    'TODO': 'TO_DO',
    'INPROGRESS': 'IN_PROGRESS',
    'REVIEW': 'REVIEW',
    'DONE': 'DONE'
  };

  // Reverse mapping
  const reverseTaskStatuses = {
    'TO_DO': 'TODO',
    'IN_PROGRESS': 'IN_PROGRESS',
    'REVIEW': 'REVIEW',
    'DONE': 'DONE'
  };

  // Columns configuration
  const columns = [
    { id: 'TO_DO', title: 'งานใหม่', color: 'gray', icon: FileText },
    { id: 'IN_PROGRESS', title: 'กำลังทำ', color: 'blue', icon: PlayCircle },
    { id: 'REVIEW', title: 'รอรีวิว', color: 'yellow', icon: AlertTriangle },
    { id: 'DONE', title: 'เสร็จสิ้น', color: 'green', icon: CheckCircle }
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
  }, [selectedProject, selectedPriority, currentUser]);

  // Load current user data
  const loadCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        setCurrentUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      setError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  // Load data - only tasks assigned to current user
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        assigned_to: currentUser.user_id
      };
      
      if (selectedProject !== 'all') filters.project_id = selectedProject;
      if (selectedPriority !== 'all') filters.priority = selectedPriority;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
        fetchTasks(filters),
        ProjectService.getAllProjects(),
        UserService.getAllUsers()
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
          { id: 'all', name: 'โครงการทั้งหมด' },
          ...rawProjects.map(project => ({
            id: project.project_id || project.id,
            name: project.project_name || project.name
          }))
        ];
        setProjects(transformedProjects);
      } else {
        setProjects([{ id: 'all', name: 'โครงการทั้งหมด' }]);
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

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsUpdateModalOpen(true);
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

  // Handle acknowledge and start task with protection
  const handleAcknowledgeTask = async (taskId) => {
    if (updatingTasks.has(taskId)) {
      console.log('Task is already being updated');
      return;
    }

    try {
      setUpdatingTasks(prev => new Set(prev).add(taskId));
      
      // Optimistic update
      const previousTasks = tasks;
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'IN_PROGRESS' }
            : task
        )
      );

      const result = await updateTaskStatus(taskId, 'IN_PROGRESS');
      
      if (result.success) {
        const task = previousTasks.find(t => t.id === taskId);
        if (task) {
          await sendAcknowledgmentNotification(task);
        }
        alert('รับทราบงานและเริ่มดำเนินการแล้ว');
      } else {
        // Revert on failure
        setTasks(previousTasks);
        alert('ไม่สามารถรับทราบงานได้: ' + result.message);
      }
    } catch (error) {
      console.error('Error acknowledging task:', error);
      if (error.response?.status === 429) {
        alert('กรุณารอสักครู่ก่อนทำรายการอีกครั้ง');
      } else {
        alert('เกิดข้อผิดพลาดในการรับทราบงาน');
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

  // Handle submit for review with protection
  const handleSubmitForReview = async (taskId) => {
    if (updatingTasks.has(taskId)) {
      console.log('Task is already being updated');
      return;
    }

    const confirmed = window.confirm(
      'คุณต้องการส่งงานเพื่อรีวิวใช่หรือไม่?\n\n' +
      'งานจะถูกส่งไปยัง Manager เพื่อตรวจสอบและอนุมัติ'
    );

    if (!confirmed) return;

    try {
      setUpdatingTasks(prev => new Set(prev).add(taskId));
      
      // Optimistic update
      const previousTasks = tasks;
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'REVIEW' }
            : task
        )
      );

      const result = await updateTaskStatus(taskId, 'REVIEW');
      
      if (result.success) {
        const task = previousTasks.find(t => t.id === taskId);
        if (task) {
          await sendReviewNotification(task);
        }
        alert('ส่งงานเพื่อรีวิวสำเร็จ\nManager จะได้รับการแจ้งเตือน');
      } else {
        // Revert on failure
        setTasks(previousTasks);
        alert('ไม่สามารถส่งงานเพื่อรีวิวได้: ' + result.message);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      if (error.response?.status === 429) {
        alert('กรุณารอสักครู่ก่อนทำรายการอีกครั้ง');
      } else {
        alert('เกิดข้อผิดพลาดในการส่งงานเพื่อรีวิว');
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

  // Send acknowledgment notification
  const sendAcknowledgmentNotification = async (task) => {
    try {
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project?.name || 'โครงการ';

      const notificationData = {
        type: 'TASK_ACKNOWLEDGED',
        title: 'มีการรับทราบงาน',
        message: `${currentUser?.first_name} ${currentUser?.last_name} ได้รับทราบและเริ่มทำงาน "${task.title}" ในโครงการ "${projectName}" แล้ว`,
        related_id: task.id,
        related_type: 'task',
        priority: 'MEDIUM',
        send_email: false
      };

      await apiClient.post('/notifications/task-notification', notificationData);
    } catch (error) {
      console.error('Error sending acknowledgment notification:', error);
    }
  };

  // Send review notification
  const sendReviewNotification = async (task) => {
    try {
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project?.name || 'โครงการ';

      const notificationData = {
        type: 'REVIEW_REQUEST',
        title: 'มีงานรอการรีวิว',
        message: `งาน "${task.title}" ในโครงการ "${projectName}" ต้องการการอนุมัติจากคุณ`,
        related_id: task.id,
        related_type: 'task',
        priority: task.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        send_email: true
      };

      await apiClient.post('/notifications/task-notification', notificationData);
    } catch (error) {
      console.error('Error sending review notification:', error);
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

  // Handle drag and drop
  const handleDragStart = (e, task) => {
    if (task.status === 'REVIEW' || task.status === 'DONE' || updatingTasks.has(task.id)) {
      e.preventDefault();
      if (updatingTasks.has(task.id)) {
        alert('กำลังประมวลผลงานนี้อยู่ กรุณารอสักครู่');
      } else {
        alert('ไม่สามารถย้ายงานที่อยู่ในสถานะ REVIEW หรือ DONE ได้');
      }
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
    
    if (newStatus === 'REVIEW' || newStatus === 'DONE') {
      alert('กรุณาใช้ปุ่มเพื่อส่งงานเพื่อรีวิว');
      setDraggedTask(null);
      return;
    }
    
    if (draggedTask.status !== newStatus && !updatingTasks.has(draggedTask.id)) {
      setUpdatingTasks(prev => new Set(prev).add(draggedTask.id));
      
      const previousTasks = tasks;
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === draggedTask.id 
            ? { ...task, status: newStatus }
            : task
        )
      );

      const backendStatus = reverseTaskStatuses[newStatus] || newStatus;
      
      try {
        const result = await updateTaskStatus(draggedTask.id, backendStatus);
        
        if (!result.success) {
          setTasks(previousTasks);
        }
      } catch (error) {
        setTasks(previousTasks);
        if (error.response?.status === 429) {
          alert('กรุณารอสักครู่ก่อนทำรายการอีกครั้ง');
        }
      } finally {
        setTimeout(() => {
          setUpdatingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(draggedTask.id);
            return newSet;
          });
        }, 1000);
      }
    }
    
    setDraggedTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
                         task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
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

  // Check if task is being updated
  const isTaskUpdating = (taskId) => {
    return updatingTasks.has(taskId);
  };

  // Task Card Component
  const TaskCard = ({ task }) => {
    const taskUpdating = isTaskUpdating(task.id);

    return (
      <div
        draggable={task.status !== 'REVIEW' && task.status !== 'DONE' && !taskUpdating}
        onDragStart={(e) => handleDragStart(e, task)}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer group mb-3 ${
          isOverdue(task.dueDate) && task.status !== 'DONE' ? 'border-l-4 border-l-red-500' : ''
        } ${task.status === 'REVIEW' ? 'border-l-4 border-l-yellow-500' : ''} ${taskUpdating ? 'opacity-60' : ''}`}
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
            {task.status !== 'REVIEW' && task.status !== 'DONE' && !taskUpdating && (
              <div className="opacity-0 group-hover:opacity-100">
                <button 
                  onClick={() => handleEditTask(task)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-all"
                  title="แก้ไขงาน"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
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
              <span>ความคืบหน้า</span>
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
                isOverdue(task.dueDate) && task.status !== 'DONE' ? 'เกินกำหนด' : 
                getDaysRemaining(task.dueDate) === 0 ? 'ครบกำหนดวันนี้' :
                getDaysRemaining(task.dueDate) === 1 ? 'ครบกำหนดพรุ่งนี้' :
                getDaysRemaining(task.dueDate) > 0 ? `เหลือ ${getDaysRemaining(task.dueDate)} วัน` :
                `เกินกำหนด ${Math.abs(getDaysRemaining(task.dueDate))} วัน`
              ) : 'ไม่กำหนดวัน'}
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
          
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityTextColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>

        {/* Action Buttons */}
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
                  <AlertTriangle className="w-4 h-4" />
                  ส่งงานเพื่อรีวิว
                </>
              )}
            </button>
          </div>
        )}

        {task.status === 'REVIEW' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">รอการตรวจสอบ</p>
                <p className="text-xs text-yellow-700 mt-1">
                  งานของคุณกำลังรอการอนุมัติจาก Manager
                </p>
              </div>
            </div>
          </div>
        )}

        {task.status === 'DONE' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">งานเสร็จสมบูรณ์</p>
                <p className="text-xs text-green-700 mt-1">
                  งานนี้ได้รับการอนุมัติแล้ว
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Kanban Column Component
  const KanbanColumn = ({ column, tasks }) => {
    const Icon = column.icon;
    return (
      <div className="bg-gray-50 rounded-lg p-4 min-h-[600px] flex-1 min-w-[280px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 text-${column.color}-600`} />
            <h3 className="font-medium text-gray-900">{column.title}</h3>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              {getColumnCount(column.id)}
            </span>
          </div>
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
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดงานของคุณ...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ลองอีกครั้ง
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
              <h1 className="text-3xl font-bold text-gray-900">งานของฉัน</h1>
              <p className="text-gray-600 mt-1">จัดการและติดตามงานที่ได้รับมอบหมาย</p>
              {currentUser && (
                <p className="text-sm text-gray-500 mt-1">
                  สวัสดี {currentUser.first_name} {currentUser.last_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                พนักงาน
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหางาน..."
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
            </div>
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">งานทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">กำลังทำ</p>
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
                <p className="text-sm text-gray-600">รอรีวิว</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีงานในขณะนี้</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedProject !== 'all' || selectedPriority !== 'all' 
                ? 'ลองปรับเปลี่ยนตัวกรองที่ใช้' 
                : 'คุณยังไม่มีงานที่ได้รับมอบหมาย'}
            </p>
          </div>
        )}

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

export default EmployeeTasksPage;