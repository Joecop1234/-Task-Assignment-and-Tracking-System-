import React from 'react';
import Modal from '../common/Modal';
import TaskForm from './TaskForm';

const CreateTaskModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  projects = [], 
  users = [], 
  isLoading = false 
}) => {
  
  // Handle form submission with file upload
  const handleFormSubmit = async (formData) => {
    try {
      // Submit task data first
      const taskResult = await onSubmit(formData);
      
      // Get task ID for file upload and notifications
      const taskId = taskResult?.id || taskResult?.data?.task_id;
      
      // Upload files if any
      if (taskId && formData.selectedFiles && formData.selectedFiles.length > 0) {
        await uploadFiles(taskId, formData.selectedFiles);
      }

      // Send notification
      if (taskId) {
        await sendNotification(formData, taskId, 'create');
      }

      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Create task error:', error);
    }
  };

  // Upload files after task creation
  const uploadFiles = async (taskId, files) => {
    if (!files || files.length === 0) return true;

    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('related_type', 'task');
    formData.append('related_id', taskId.toString());

    try {
      const response = await fetch('/api/files/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('File upload failed:', result.message);
        alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + result.message);
        return false;
      }

      console.log('Files uploaded successfully:', result.data);
      return true;
    } catch (error) {
      console.error('File upload error:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
      return false;
    }
  };



  // Handle modal close
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="สร้าง Task ใหม่"
      size="lg"
    >
      <TaskForm
        mode="create"
        onSubmit={handleFormSubmit}
        projects={projects}
        users={users}
        isLoading={isLoading}
        isSubmitting={isLoading}
      />
    </Modal>
  );
};

export default CreateTaskModal;