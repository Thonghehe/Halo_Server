import { useEffect } from 'react';
import '../styles/NotificationToast.css';

function NotificationToast({ notification, onClose, onView }) {
  // Tự động đóng sau 10 giây
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClick = () => {
    onView?.(notification);
    onClose();
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

  if (!notification) return null;

  return (
    <div className="notification-toast" onClick={handleClick}>
      <div className="notification-toast-content">
        <div className="notification-toast-icon">
          <i className={`bi ${getTypeIcon(notification.type)} ${getTypeColor(notification.type)}`}></i>
        </div>
        <div className="notification-toast-body">
          <div className="notification-toast-title">{notification.title}</div>
          <div className="notification-toast-message">{notification.message}</div>
        </div>
        <button 
          className="notification-toast-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Đóng"
        >
          <i className="bi bi-x"></i>
        </button>
      </div>
    </div>
  );
}

export default NotificationToast;

