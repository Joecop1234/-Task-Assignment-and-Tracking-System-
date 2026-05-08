import React from "react";
import Swal from "sweetalert2";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    Swal.fire({
      title: "คุณมีข้อมูลที่ยังไม่ได้บันทึก",
      text: "คุณต้องการออกจากหน้านี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "ใช่, ออกจากหน้านี้",
      cancelButtonText: "ไม่, ฉันต้องการอยู่ในหน้านี้",
    }).then((result) => {
      if (result.isConfirmed) {
        onClose();
      }
    });
  };

  return (
    <div className="modal-container">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">
                  {title}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="p-6 bg-gray-50">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        body {
          overflow: ${isOpen ? 'hidden' : 'auto'};
        }
      `}</style>
    </div>
  );
};

export default Modal;