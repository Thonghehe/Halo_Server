import { useState } from 'react';
import '../styles/NotificationDetailModal.css';
import OrderDetailModal from './OrderDetailModal';
import api from '../utils/api';

function NotificationDetailModal({ notification, show, onClose }) {
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [checkingOrder, setCheckingOrder] = useState(false);
  
  if (!show || !notification) return null;

  const getOrderId = () => {
    // Ưu tiên lấy từ notification.orderId
    if (notification.orderId) {
      if (typeof notification.orderId === 'string') return notification.orderId;
      if (notification.orderId._id) return notification.orderId._id;
    }
    // Nếu không có, thử lấy từ metadata
    if (notification.metadata && notification.metadata.orderId) {
      return notification.metadata.orderId;
    }
    return null;
  };

  const getOrderCode = () => {
    if (notification.orderId) {
      if (typeof notification.orderId === 'object' && notification.orderId.orderCode) {
        return notification.orderId.orderCode;
      }
      if (typeof notification.orderId === 'string') {
        // Nếu là string, có thể là orderCode hoặc _id
        return notification.orderId;
      }
    }
    if (notification.metadata && notification.metadata.orderCode) {
      return notification.metadata.orderCode;
    }
    return null;
  };

  const handleOrderCodeClick = async (e) => {
    e.stopPropagation();
    const orderId = getOrderId();
    if (!orderId || checkingOrder) return;
    setOrderError('');
    setCheckingOrder(true);
    try {
      await api.get(`/api/orders/${orderId}`);
      setShowOrderDetail(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setOrderError('Đơn hàng này đã bị xóa hoặc không còn tồn tại.');
      } else {
        setOrderError('Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.');
      }
    } finally {
      setCheckingOrder(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      info: 'bi-info-circle',
      success: 'bi-check-circle',
      warning: 'bi-exclamation-triangle',
      error: 'bi-x-circle',
      order: 'bi-box-seam',
      system: 'bi-gear'
    };
    return icons[type] || 'bi-bell';
  };

  const getTypeColor = (type) => {
    const colors = {
      info: 'text-info',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-danger',
      order: 'text-primary',
      system: 'text-secondary'
    };
    return colors[type] || 'text-secondary';
  };

  const getTypeLabel = (type) => {
    const labels = {
      info: 'Thông tin',
      success: 'Thành công',
      warning: 'Cảnh báo',
      error: 'Lỗi',
      order: 'Đơn hàng',
      system: 'Hệ thống'
    };
    return labels[type] || 'Thông báo';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} lúc ${hours}:${minutes}`;
    } catch {
      return new Date(dateString).toLocaleString('vi-VN');
    }
  };

  return (
    <div className="notification-detail-overlay" onClick={onClose}>
      <div className="notification-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-detail-header">
          <div className="notification-detail-title-section">
            <i className={`bi ${getTypeIcon(notification.type)} ${getTypeColor(notification.type)} notification-detail-icon`}></i>
            <div>
              <h5 className="notification-detail-title">{notification.title}</h5>
              <span className={`badge ${getTypeColor(notification.type).replace('text-', 'bg-')}`}>
                {getTypeLabel(notification.type)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="notification-detail-close"
            onClick={onClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="notification-detail-body">
          <div className="notification-detail-message">
            {notification.message}
          </div>

          {(notification.orderId || (notification.metadata && notification.metadata.orderCode)) && (
            <div className="notification-detail-order">
              <h6>Thông tin đơn hàng:</h6>
              {getOrderCode() && (
                <p>
                  <strong>Mã đơn:</strong>{' '}
                  <span 
                    className="order-code-link" 
                    onClick={handleOrderCodeClick}
                    style={{ 
                      color: '#0d6efd', 
                      cursor: 'pointer', 
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                    title="Click để xem chi tiết đơn hàng"
                  >
                    {getOrderCode()}
                  </span>
                </p>
              )}
              {notification.orderId && typeof notification.orderId === 'object' && notification.orderId.customerName && (
                <p><strong>Khách hàng:</strong> {notification.orderId.customerName}</p>
              )}
              {orderError && (
                <div className="alert alert-warning mt-2" role="alert">
                  {orderError}
                </div>
              )}
            </div>
          )}

          {notification.sender && (
            <div className="notification-detail-sender">
              <p><strong>Người gửi:</strong> {notification.sender.fullName || notification.sender.email}</p>
            </div>
          )}

          {notification.metadata && notification.metadata.changes && Array.isArray(notification.metadata.changes) && notification.metadata.changes.length > 0 && (
            <div className="notification-detail-metadata">
              <div className="metadata-changes">
                <div className="metadata-changes-header">
                  <i className="bi bi-pencil-square"></i>
                  <span>Chi tiết thay đổi</span>
                </div>
                <div className="changes-list">
                  {notification.metadata.changes.map((change, index) => (
                    <div key={index} className="change-item">
                      <i className="bi bi-arrow-right-circle"></i>
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="notification-detail-time">
            <i className="bi bi-clock"></i>
            <span>{formatDate(notification.createdAt)}</span>
          </div>
        </div>

        <div className="notification-detail-footer">
          {getOrderId() && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={checkingOrder}
              onClick={(e) => {
                e.stopPropagation();
                handleOrderCodeClick(e);
              }}
            >
              <i className="bi bi-arrow-right"></i> {checkingOrder ? 'Đang kiểm tra...' : 'Xem chi tiết'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>

      {showOrderDetail && getOrderId() && (
        <OrderDetailModal
          orderId={getOrderId()}
          show={showOrderDetail}
          onClose={() => setShowOrderDetail(false)}
          onOrderUpdated={() => {
            // Có thể reload notifications nếu cần
          }}
        />
      )}
    </div>
  );
}

export default NotificationDetailModal;

