import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';
import logoHalo from '../assets/images/logohalo.png';

const ADMIN_APP_URL = import.meta.env.VITE_PUBLIC_ADMIN_APP_URL || window.location.origin;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const redirectToAdmin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = `${ADMIN_APP_URL.replace(/\/$/, '')}/login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        const user = result.user;
        if (user.roles?.includes('admin')) {
          redirectToAdmin();
          return;
        }

        navigate('/orders');
      } else {
        setError(result.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      // Hiển thị message từ backend hoặc message đã được format trong interceptor
      setError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoHalo} alt="Halo Logo" style={{ maxWidth: '200px', height: 'auto', marginBottom: '0.25rem' }} />
          <p className="mb-0" style={{ fontSize: '22px', marginTop: '4px', fontWeight: 'bold' }}>Hệ thống quản lý đơn hàng</p>
        </div>
        <div className="login-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-login w-100"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          <div className="text-center mt-3 d-flex flex-column gap-2">
            <Link to="/forgot-password" className="text-decoration-none">
              Quên mật khẩu?
            </Link>
            <Link to="/register" className="text-decoration-none">
              Chưa có tài khoản? Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

