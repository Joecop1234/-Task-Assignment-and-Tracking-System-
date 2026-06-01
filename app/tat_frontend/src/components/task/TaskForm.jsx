import React, { useState, useEffect } from 'react';
import { Calendar, User, Flag, Clock, FileText, Paperclip, Upload, X, Download } from 'lucide-react';

const TaskForm = ({ 
  initialData = null,
  onSubmit, 
  projects = [], 
  users = [], 
  isLoading = false,
  isSubmitting = false,
  mode = 'create' // 'create' or 'update'
}) => {
  const [formData, setFormData] = useState({
    task_title: '',
    task_description: '',
    project_id: '',
    assigned_to: '',
    priority: 'MEDIUM',
    status: 'TO_DO',
    due_date: '',
    estimated_hours: '',
    tags: ''
  });

  const [errors, setErrors] = useState({});
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Priority options
  const priorityOptions = [
    { value: 'LOW', label: 'ต่ำ', color: 'bg-green-100 text-green-800', icon: '🟢' },
    { value: 'MEDIUM', label: 'ปานกลาง', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
    { value: 'HIGH', label: 'สูง', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
    { value: 'CRITICAL', label: 'วิกฤต', color: 'bg-red-100 text-red-800', icon: '🔴' }
  ];

  // Status options
  const statusOptions = [
    { value: 'TO_DO', label: 'รอดำเนินการ', color: 'bg-gray-100 text-gray-800' },
    { value: 'IN_PROGRESS', label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-800' },
    { value: 'REVIEW', label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'DONE', label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-800' }
  ];

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      const backendStatus = getBackendStatus(initialData.status);
      
      setFormData({
        task_title: initialData.title || '',
        task_description: initialData.description || '',
        project_id: initialData.projectId?.toString() || '',
        assigned_to: initialData.assigneeId?.toString() || '',
        priority: initialData.priority || 'MEDIUM',
        status: backendStatus,
        due_date: initialData.dueDate ? initialData.dueDate.split('T')[0] : '',
        estimated_hours: initialData.estimatedHours?.toString() || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : ''
      });

      // Load existing files for edit mode
      if (mode === 'update' && initialData.id) {
        loadTaskFiles(initialData.id);
      }
    } else {
      // Reset form for create mode
      setFormData({
        task_title: '',
        task_description: '',
        project_id: '',
        assigned_to: '',
        priority: 'MEDIUM',
        status: 'TO_DO',
        due_date: '',
        estimated_hours: '',
        tags: ''
      });
      setExistingFiles([]);
    }
    
    setErrors({});
    setSelectedFiles([]);
  }, [initialData, mode]);

  // Convert frontend status to backend status
  const getBackendStatus = (frontendStatus) => {
    const statusMap = {
      'TO_DO': 'TO_DO',
      'IN_PROGRESS': 'IN_PROGRESS', 
      'REVIEW': 'REVIEW',
      'DONE': 'DONE'
    };
    return statusMap[frontendStatus] || 'TO_DO';
  };

  // Load task files
  const loadTaskFiles = async (taskId) => {
    try {
      const response = await fetch(`/api/files/related/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setExistingFiles(result.data.files || []);
      }
    } catch (error) {
      console.error('Error loading task files:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip'
    ];

    files.forEach(file => {
      if (file.size > maxSize) {
        alert(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`);
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        alert(`ประเภทไฟล์ ${file.name} ไม่ได้รับอนุญาต`);
        return;
      }

      // Check for duplicate files
      const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!isDuplicate) {
        validFiles.push(file);
      }
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  // Remove selected file
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing file
  const removeExistingFile = async (fileId) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setExistingFiles(prev => prev.filter(f => f.file_id !== fileId));
      } else {
        alert('ไม่สามารถลบไฟล์ได้');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('เกิดข้อผิดพลาดในการลบไฟล์');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    if (mimeType?.includes('zip')) return '🗜️';
    return '📎';
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.task_title.trim()) {
      newErrors.task_title = 'กรุณาระบุชื่อ task';
    } else if (formData.task_title.trim().length < 3) {
      newErrors.task_title = 'ชื่อ task ต้องมีอย่างน้อย 3 ตัวอักษร';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'กรุณาเลือกโครงการ';
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.due_date = 'วันที่กำหนดส่งต้องเป็นวันนี้หรือในอนาคต';
      }
    }

    if (formData.estimated_hours && (isNaN(formData.estimated_hours) || parseFloat(formData.estimated_hours) <= 0)) {
      newErrors.estimated_hours = 'ชั่วโมงประมาณการต้องเป็นตัวเลขที่มากกว่า 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      project_id: parseInt(formData.project_id),
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      selectedFiles: selectedFiles
    };

    onSubmit(submitData);
  };

  // Get projects filtered for current user if needed
  const availableProjects = projects.filter(p => p.id !== 'all');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Task Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          ชื่อ Task *
        </label>
        <input
          type="text"
          name="task_title"
          value={formData.task_title}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.task_title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="ระบุชื่อ task"
          disabled={isSubmitting || isUploadingFiles}
          maxLength={200}
        />
        {errors.task_title && (
          <p className="mt-1 text-sm text-red-600">{errors.task_title}</p>
        )}
      </div>

      {/* Task Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          รายละเอียด Task
        </label>
        <textarea
          name="task_description"
          value={formData.task_description}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="อธิบายรายละเอียดของ task"
          disabled={isSubmitting || isUploadingFiles}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            โครงการ *
          </label>
          <select
            name="project_id"
            value={formData.project_id}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.project_id ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting || isUploadingFiles}
          >
            <option value="">เลือกโครงการ</option>
            {availableProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
          )}
        </div>

        {/* Assignee Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            ผู้รับผิดชอบ
          </label>
          <select
            name="assigned_to"
            value={formData.assigned_to}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting || isUploadingFiles}
          >
            <option value="">เลือกผู้รับผิดชอบ</option>
            {users.map(user => (
              <option key={user.userId} value={user.userId}>
                {user.firstName} {user.lastName} ({user.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Flag className="w-4 h-4 inline mr-2" />
            ระดับความสำคัญ
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting || isUploadingFiles}
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status (only show in update mode) */}
        {mode === 'update' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะ
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting || isUploadingFiles}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            วันที่กำหนดส่ง
          </label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.due_date ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting || isUploadingFiles}
          />
          {errors.due_date && (
            <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
          )}
        </div>

        {/* Estimated Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            ชั่วโมงประมาณการ
          </label>
          <input
            type="number"
            name="estimated_hours"
            value={formData.estimated_hours}
            onChange={handleInputChange}
            min="0"
            step="0.5"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.estimated_hours ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
            disabled={isSubmitting || isUploadingFiles}
          />
          {errors.estimated_hours && (
            <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Paperclip className="w-4 h-4 inline mr-2" />
          Tags (คั่นด้วยเครื่องหมายจุลภาค)
        </label>
        <input
          type="text"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น: urgent, frontend, api"
          disabled={isSubmitting || isUploadingFiles}
        />
        <p className="mt-1 text-xs text-gray-500">
          แยกแต่ละ tag ด้วยเครื่องหมายจุลภาค เช่น "urgent, frontend, bug fix"
        </p>
      </div>

      {/* File Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Upload className="w-4 h-4 inline mr-2" />
          แนบไฟล์
        </label>
        
        {/* File Upload Input */}
        <div className="mb-4">
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip"
            disabled={isSubmitting || isUploadingFiles}
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            เลือกไฟล์
          </label>
          <p className="mt-1 text-xs text-gray-500">
            รองรับ: PDF, Word, Excel, รูปภาพ, TXT, ZIP (สูงสุด 10MB ต่อไฟล์)
          </p>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">ไฟล์ที่เลือก:</h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="mr-2">{getFileIcon(file.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isSubmitting || isUploadingFiles}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Files (Update Mode) */}
        {mode === 'update' && existingFiles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">ไฟล์ที่แนบอยู่:</h4>
            <div className="space-y-2">
              {existingFiles.map((file) => (
                <div key={file.file_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="mr-2">{getFileIcon(file.mime_type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {file.formatted_size} • อัปโหลดเมื่อ {new Date(file.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/api/files/${file.file_id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                      title="ดาวน์โหลด"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(file.file_id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isSubmitting || isUploadingFiles}
                      title="ลบไฟล์"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploadingFiles && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-600">กำลังอัปโหลดไฟล์...</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting || isUploadingFiles}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {(isSubmitting || isUploadingFiles) && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isUploadingFiles ? 'กำลังอัปโหลดไฟล์...' : 
           isSubmitting ? 'กำลังบันทึก...' :
           mode === 'update' ? 'อัปเดต Task' : 'สร้าง Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;