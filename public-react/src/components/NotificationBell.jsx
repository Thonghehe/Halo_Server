import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import NotificationDetailModal from './NotificationDetailModal';
import { useRecentNotifications, useUnreadNotificationsCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import '../styles/NotificationBell.css';

function NotificationBell({ onBellClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const dropdownRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // Sử dụng React Query hooks
  const { data: notifications = [] } = useRecentNotifications(10);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // SSE stream để cập nhật real-time
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/api/notifications/stream?token=${token}`);

    eventSource.onmessage = () => {
      // Invalidate tất cả queries notifications (list, count, recent)
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'notifications'
      });
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
    setShowDropdown(false);
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

  if (!user) return null;

  return (
    <>
      <div className="notification-bell-container" ref={dropdownRef}>
        <button
          className="notification-bell-btn"
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (onBellClick) {
              onBellClick();
            }
          }}
          aria-label="Thông báo"
        >
          <i className="bi bi-bell"></i>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {showDropdown && (
          <div className="notification-dropdown">
            <div className="notification-dropdown-header">
              <h6 className="mb-0">Thông báo</h6>
              {unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-link p-0"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="notification-dropdown-body">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <i className="bi bi-bell-slash"></i>
                  <p>Không có thông báo nào</p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-item-icon">
                        <i className={`bi ${getTypeIcon(notification.type)} ${getTypeColor(notification.type)}`}></i>
                      </div>
                      <div className="notification-item-content">
                        <div className="notification-item-title">{notification.title}</div>
                        <div className="notification-item-message">{notification.message}</div>
                        <div className="notification-item-time">{formatTime(notification.createdAt)}</div>
                      </div>
                      {!notification.read && <div className="notification-item-dot"></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="notification-dropdown-footer">
                <a 
                  href="#" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    setShowDropdown(false);
                    navigate('/notifications');
                  }}
                >
                  Xem tất cả
                </a>
              </div>
            )}
          </div>
        )}
      </div>

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
    </>
  );
}

export default NotificationBell;

