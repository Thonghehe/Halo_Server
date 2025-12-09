import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import '../styles/Layout.css';
import ConfirmModal from './ConfirmModal';
import NotificationBell from './NotificationBell';
import NotificationToast from './NotificationToast';
import NotificationDetailModal from './NotificationDetailModal';
import logoHalo from '../assets/images/logohalo.png';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [hasCheckedNotifications, setHasCheckedNotifications] = useState(false);
  const [toastDetailNotification, setToastDetailNotification] = useState(null);
  const [showToastDetailModal, setShowToastDetailModal] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const isActive = (path) => location.pathname === path;

  // Đóng sidebar khi click vào link
  const handleLinkClick = () => {
    if (window.innerWidth <= 991) {
      setSidebarOpen(false);
    }
  };

  // Đóng sidebar khi resize về desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load số lượng thông báo chưa đọc
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // Polling mỗi 30 giây để cập nhật số lượng thông báo
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications?limit=1');
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Lắng nghe thông báo mới từ SSE stream
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/api/notifications/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Cập nhật số lượng thông báo chưa đọc
        if (!data.read) {
          setUnreadCount((prev) => prev + 1);
          // Hiển thị toast notification cho thông báo mới
          setCurrentNotification(data);
          // Hiện lại dòng thông báo khi có thông báo mới
          setHasCheckedNotifications(false);
        }
      } catch (error) {
        console.error('Error parsing notification stream:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, API_BASE_URL]);

  const handleCloseNotification = () => {
    setCurrentNotification(null);
  };

  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewNotification = async (notification) => {
    if (!notification) return;
    if (!notification.read) {
      await markNotificationAsRead(notification._id);
    }
    setToastDetailNotification(notification);
    setShowToastDetailModal(true);
    setHasCheckedNotifications(true);
  };

  return (
    <div className="main-wrapper">
      {/* Overlay cho mobile/tablet */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px' }}>
          <img src={logoHalo} alt="Halo Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain' }} />
          <h4 style={{ margin: 0 }}>Admin</h4>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <ul className="sidebar-menu">
          <li>
            <Link 
              to="/users" 
              className={isActive('/users') ? 'active' : ''}
              onClick={handleLinkClick}
            >
              <i className="bi bi-people"></i>
              <span>Users</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/orders" 
              className={isActive('/orders') || location.pathname.startsWith('/orders') ? 'active' : ''}
              onClick={handleLinkClick}
            >
              <i className="bi bi-box-seam"></i>
              <span>Đơn hàng</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/profile" 
              className={isActive('/profile') ? 'active' : ''}
              onClick={handleLinkClick}
            >
              <i className="bi bi-person-circle"></i>
              <span>Profile</span>
            </Link>
          </li>
          <li>
            <Link 
              to="/notifications" 
              className={isActive('/notifications') ? 'active' : ''}
              onClick={handleLinkClick}
            >
              <i className="bi bi-bell"></i>
              <span>Thông báo</span>
            </Link>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowLogoutConfirm(true); handleLinkClick(); }}>
              <i className="bi bi-box-arrow-right"></i>
              <span>Đăng xuất</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <button 
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Mở menu"
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex flex-column">
              <span>Xin chào, <strong>{user?.fullName}</strong></span>
              {unreadCount > 0 && !hasCheckedNotifications && (
                <Link 
                  to="/notifications" 
                  className="text-decoration-none text-warning small"
                  style={{ fontSize: '0.875rem' }}
                >
                  <i className="bi bi-bell-fill me-1"></i>
                  Bạn có <strong>{unreadCount}</strong> thông báo mới, vui lòng check
                </Link>
              )}
            </div>
            <NotificationBell onBellClick={() => setHasCheckedNotifications(true)} />
            <button className="btn btn-outline-danger" onClick={() => setShowLogoutConfirm(true)}>
              Đăng xuất
            </button>
          </div>
        </div>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
      <ConfirmModal
        show={showLogoutConfirm}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất không?"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
      />
      
      {/* Notification Toast */}
      {currentNotification && (
        <NotificationToast
          notification={currentNotification}
          onClose={handleCloseNotification}
          onView={handleViewNotification}
        />
      )}

      {showToastDetailModal && toastDetailNotification && (
        <NotificationDetailModal
          notification={toastDetailNotification}
          show={showToastDetailModal}
          onClose={() => {
            setShowToastDetailModal(false);
            setToastDetailNotification(null);
          }}
        />
      )}
    </div>
  );
}

export default Layout;

