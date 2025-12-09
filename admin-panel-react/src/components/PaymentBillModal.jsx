import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const PaymentBillModal = ({ show, onClose, onConfirm, existingImages = [], onError }) => {
  const [billImages, setBillImages] = useState(existingImages || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleUpload = async (event) => {
    const input = event.target;
    const files = input?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('images', file));
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
      if (input) {
        input.value = '';
      }
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
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex flex-column justify-content-center align-items-center"
                  style={{ width: 120, height: 120 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mb-2" role="status" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle mb-2" style={{ fontSize: 24 }}></i>
                      Thêm ảnh
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="d-none"
                  onChange={handleUpload}
                />
              </div>
              <small className="text-muted d-block mt-2">
                Chấp nhận nhiều ảnh. Hỗ trợ PNG, JPG, JPEG, GIF, WEBP (tối đa 20MB mỗi ảnh).
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


