import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, AlertCircle } from 'lucide-react';

const ReviewApprovalSection = ({ 
  task, 
  currentUser, 
  onApprove, 
  onReject,
  isLoading = false 
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [errors, setErrors] = useState('');

  // ตรวจสอบว่าเป็น Manager หรือไม่
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  
  // ตรวจสอบว่าเป็นผู้รับผิดชอบงานหรือไม่
  const isAssignee = task?.assigneeId === currentUser?.userId;

  // แสดงเฉพาะใน REVIEW status
  if (task?.status !== 'REVIEW') {
    return null;
  }

  const handleApprove = async () => {
    if (isLoading) return;
    
    try {
      await onApprove(task.id);
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectReason('');
    setErrors('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setErrors('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    if (rejectReason.trim().length < 10) {
      setErrors('เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร');
      return;
    }

    try {
      await onReject(task.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setErrors('');
    } catch (error) {
      console.error('Reject error:', error);
      setErrors('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setErrors('');
  };

  return (
    <>
      {/* Approval Buttons for Manager */}
      {isManager && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">
              งานนี้รอการอนุมัติจากคุณ
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              อนุมัติงาน
            </button>
            
            <button
              onClick={handleRejectClick}
              disabled={isLoading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              ปฏิเสธ
            </button>
          </div>
        </div>
      )}

      {/* Status Info for Assignee */}
      {!isManager && isAssignee && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                รอการตรวจสอบ
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                งานของคุณกำลังรอการอนุมัติจาก Manager
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    ปฏิเสธงาน
                  </h3>
                  <p className="text-sm text-gray-600">
                    {task.title}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  เหตุผลในการปฏิเสธ *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (errors) setErrors('');
                  }}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ระบุสิ่งที่ต้องแก้ไข เช่น ฟีเจอร์ยังไม่ทำงาน, ต้องปรับปรุง UI, มี bug..."
                  disabled={isLoading}
                />
                {errors && (
                  <p className="mt-1 text-sm text-red-600">{errors}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  คำอธิบายนี้จะถูกส่งให้ผู้รับผิดชอบเพื่อแก้ไข
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelReject}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  ยืนยันปฏิเสธ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewApprovalSection;