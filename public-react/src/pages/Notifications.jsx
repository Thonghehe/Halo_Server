import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import NotificationDetailModal from '../components/NotificationDetailModal';
import { Mosaic } from 'react-loading-indicators';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import '../styles/Notifications.css';

function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    read: '', // '', 'true', 'false'
    type: ''
  });
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // Build query filters
  const queryFilters = {
    limit: 100,
    ...(filters.read !== '' && { read: filters.read }),
    ...(filters.type && { type: filters.type })
  };

  // Sử dụng React Query hooks
  const { data: notificationsData, isLoading: loading } = useNotifications(queryFilters);
  const notifications = notificationsData?.notifications || notificationsData || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  // SSE stream để cập nhật real-time
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/api/notifications/stream?token=${token}`);

    eventSource.onmessage = () => {
      // Invalidate queries để refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, API_BASE_URL, queryClient]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Đánh dấu đã đọc
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }
    
    // Hiển thị chi tiết
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return new Date(dateString).toLocaleString('vi-VN');
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

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2>
          <i className="bi bi-bell"></i> Thông báo
        </h2>
        {unreadCount > 0 && (
          <button
            className="btn btn-primary"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsRead.isPending}
                  >
                    {markAllAsRead.isPending ? (
              <>
                <Mosaic color={["#fff"]} size="small" />
                <span className="ms-2">Đang xử lý...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check-all"></i> Đánh dấu tất cả đã đọc
              </>
            )}
          </button>
        )}
      </div>

      <div className="notifications-filters">
        <div className="filter-group">
          <label>Trạng thái:</label>
          <select
            className="form-select"
            value={filters.read}
            onChange={(e) => setFilters({ ...filters, read: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="false">Chưa đọc</option>
            <option value="true">Đã đọc</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Loại:</label>
          <select
            className="form-select"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="info">Thông tin</option>
            <option value="success">Thành công</option>
            <option value="warning">Cảnh báo</option>
            <option value="error">Lỗi</option>
            <option value="order">Đơn hàng</option>
            <option value="system">Hệ thống</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="notifications-loading">
          <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <i className="bi bi-bell-slash"></i>
          <p>Không có thông báo nào</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-card ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-card-icon">
                <i className={`bi ${getTypeIcon(notification.type)} ${getTypeColor(notification.type)}`}></i>
              </div>
              <div className="notification-card-content">
                <div className="notification-card-header">
                  <div className="notification-card-title">{notification.title}</div>
                  <div className="notification-card-badges">
                    <span className={`badge ${getTypeColor(notification.type).replace('text-', 'bg-')}`}>
                      {getTypeLabel(notification.type)}
                    </span>
                    {!notification.read && (
                      <span className="badge bg-danger">Chưa đọc</span>
                    )}
                  </div>
                </div>
                <div className="notification-card-message">{notification.message}</div>
                <div className="notification-card-footer">
                  <span className="notification-card-time">
                    <i className="bi bi-clock"></i> {formatTime(notification.createdAt)}
                  </span>
                  <span className="notification-card-date">{formatDate(notification.createdAt)}</span>
                </div>
              </div>
              {!notification.read && <div className="notification-card-dot"></div>}
            </div>
          ))}
        </div>
      )}

      {showDetailModal && selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          show={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedNotification(null);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
}

export default Notifications;

