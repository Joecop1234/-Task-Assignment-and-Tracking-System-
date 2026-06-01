import React from 'react';
import Modal from '../common/Modal';
import TaskForm from './TaskForm';

const UpdateTaskModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  task = null,
  projects = [], 
  users = [], 
  isLoading = false 
}) => {
  
  const handleFormSubmit = async (formData) => {
    try {
      // Submit task update
      const taskResult = await onSubmit(formData);
      
      // Get task ID for file upload
      const taskId = task?.id;
      
      // Upload new files if any
      if (taskId && formData.selectedFiles && formData.selectedFiles.length > 0) {
        await uploadFiles(taskId, formData.selectedFiles);
      }

      // Send notification for updates
      if (taskId) {
        await sendNotification(formData, taskId, 'update');
      }

      onClose();
    } catch (error) {
      console.error('Update task error:', error);
    }
  };

  // Upload files one by one to match your API
  const uploadFiles = async (taskId, files) => {
    if (!files || files.length === 0) return true;

    const API_BASE_URL = 'http://localhost:5000';
    let uploadErrors = [];

    // Loop through each file and upload individually
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file); // เปลี่ยนจาก 'files' เป็น 'file'
        formData.append('related_type', 'task');
        formData.append('related_id', taskId.toString());

        const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
          uploadErrors.push(`${file.name}: ${result.message}`);
        }
      } catch (error) {
        uploadErrors.push(`${file.name}: ${error.message}`);
      }
    }

    // Show results
    if (uploadErrors.length > 0) {
      console.error('Some files failed to upload:', uploadErrors);
      alert(`ไฟล์บางไฟล์อัปโหลดไม่สำเร็จ:\n${uploadErrors.join('\n')}`);
      return false;
    }

    console.log('All files uploaded successfully');
    return true;
  };

  const sendNotification = async (taskData, taskId, actionType) => {
    try {
      const recipientId = task?.assigneeId;
      
      if (!recipientId) return;

      const API_BASE_URL = 'http://localhost:5000';
      const project = projects.find(p => p.id === taskData.project_id);
      const projectName = project?.name || 'โครงการ';

      const notificationData = {
        user_id: recipientId,
        type: 'TASK_UPDATED',
        title: `งานของคุณได้รับการอัปเดท`,
        message: `งาน "${taskData.task_title}" ในโครงการ "${projectName}" ได้รับการอัปเดท`,
        related_id: taskId,
        related_type: 'task',
        priority: taskData.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        send_email: true
      };

      await fetch(`${API_BASE_URL}/api/notifications/task-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(notificationData)
      });

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="แก้ไข Task"
      size="lg"
    >
      <TaskForm
        mode="update"
        initialData={task}
        onSubmit={handleFormSubmit}
        projects={projects}
        users={users}
        isLoading={isLoading}
        isSubmitting={isLoading}
      />
    </Modal>
  );
};

export default UpdateTaskModal;
