import axios from 'axios';

const inferApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const { protocol, hostname } = window.location;
  const safeProtocol = ['http:', 'https:'].includes(protocol) ? protocol : 'http:';

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  return `${safeProtocol}//${hostname}`;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) || inferApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Nếu là FormData, không set Content-Type để axios tự động set với boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);  

// Response interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const reqUrl = error.config?.url || '';
      // Không redirect khi đang gọi login hoặc đang ở trang login
      if (reqUrl.includes('/api/auth/login')) {
        return Promise.reject(error);
      }
      
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Chỉ redirect nếu không phải đang ở trang login
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        // Sử dụng history.push thay vì window.location để tránh reload
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

