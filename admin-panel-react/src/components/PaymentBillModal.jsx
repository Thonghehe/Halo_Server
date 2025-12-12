import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const PaymentBillModal = ({ show, onClose, onConfirm, existingImages = [], onError }) => {
  const [billImages, setBillImages] = useState(existingImages || []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (show) {
      setBillImages(existingImages || []);
    }
  }, [show, existingImages]);

  if (!show) return null;

  const notifyError = (message) => {
    if (onError) {
      onError(message);
    } else {
      alert(message);
    }
  };

  const normalizeFilesInput = (files) => {
    if (!files) return [];
    if (files instanceof FileList) return Array.from(files);
    if (Array.isArray(files)) return files;
    return [files];
  };

  const handleUploadFiles = async (files) => {
    const fileList = normalizeFilesInput(files).filter(file => file && file.type?.startsWith('image/'));
    if (fileList.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      fileList.forEach((file) => formData.append('images', file));
      const response = await api.post('/api/upload/payment-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploaded = response.data?.data || [];
      if (!response.data?.success || uploaded.length === 0) {
        throw new Error(response.data?.message || 'Upload thất bại');
      }
      const urls = uploaded.map((item) => item.url).filter(Boolean);
      setBillImages((prev) => [...prev, ...urls]);
    } catch (error) {
      console.error('[PaymentBillModal] Upload error:', error);
      notifyError(error.response?.data?.message || error.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event) => {
    const input = event.target;
    const files = input?.files;
    if (!files || files.length === 0) return;
    await handleUploadFiles(files);
    if (input) {
      input.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUploadFiles(files);
    }
  };

  // Paste handler
  const handlePaste = async (e) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    const files = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        files.push(file);
      }
    }

    if (files.length > 0) {
      await handleUploadFiles(files);
    }
  };

  const handleRemove = (index) => {
    setBillImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirm = () => {
    if (billImages.length === 0 || uploading) return;
    onConfirm(billImages);
  };

  return (
    <div className="order-detail-modal-overlay" onClick={onClose}>
      <div
        className="order-detail-modal-dialog"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-receipt me-2"></i> Xác nhận khách đến nhận & thanh toán
            </h5>
            <button type="button" className="order-detail-modal-close" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              Vui lòng tải lên ảnh bill thanh toán tại cửa hàng để hoàn tất đơn hàng này.
            </div>

            <div className="mb-3">
              <label className="form-label">Ảnh bill thanh toán *</label>
              <div className="d-flex flex-wrap gap-3">
                {billImages.map((img, index) => (
                  <div
                    key={`${img}-${index}`}
                    className="position-relative"
                    style={{ width: 120, height: 120 }}
                  >
                    <img
                      src={img}
                      alt={`Bill ${index + 1}`}
                      className="img-thumbnail w-100 h-100"
                      style={{ objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                      onClick={() => handleRemove(index)}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ))}
                <div
                  ref={dropZoneRef}
                  className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                  style={{
                    width: 120,
                    height: 120,
                    border: '2px dashed #dee2e6',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: dragOver ? '#e7f3ff' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  onClick={(e) => {
                    if (e.target.tagName !== 'INPUT') {
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="d-none"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mb-2" role="status" />
                      <small className="text-muted">Đang tải...</small>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle mb-2" style={{ fontSize: 24 }}></i>
                      <small className="text-muted text-center px-2">Thêm ảnh</small>
                    </>
                  )}
                </div>
              </div>
              <small className="text-muted d-block mt-2">
                Kéo thả ảnh vào đây, chọn nhiều file hoặc paste từ clipboard. Hỗ trợ PNG, JPG, JPEG, GIF, WEBP (tối đa 20MB mỗi ảnh).
              </small>
            </div>
          </div>
          <div className="order-detail-modal-footer">
            <div className="d-flex justify-content-end gap-2 w-100">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={billImages.length === 0 || uploading}
              >
                Xác nhận hoàn thành
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentBillModal;


