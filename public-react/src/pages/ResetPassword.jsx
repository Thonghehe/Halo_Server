import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Login.css';
import logoHalo from '../assets/images/logohalo.png';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetToken = location.state?.resetToken;
  const email = location.state?.email;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!resetToken) {
      setError('Phiên đặt lại đã hết hạn. Vui lòng nhận lại OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password', { resetToken, newPassword });
      if (response.data?.success) {
        setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(response.data?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoHalo} alt="Halo Logo" style={{ maxWidth: '200px', height: 'auto', marginBottom: '0.25rem' }} />
          <p className="mb-0" style={{ fontSize: '22px', marginTop: '4px', fontWeight: 'bold' }}>Đặt lại mật khẩu</p>
          {email && <small className="text-muted">Đang đặt lại cho {email}</small>}
        </div>
        <div className="login-body">
          {!resetToken && (
            <div className="alert alert-warning" role="alert">
              Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng{' '}
              <Link to="/forgot-password" className="fw-semibold">
                yêu cầu mã OTP mới
              </Link>
              .
            </div>
          )}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="alert alert-success" role="alert">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Mật khẩu mới</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-login w-100" disabled={loading || !resetToken}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
          <div className="text-center mt-3 d-flex flex-column gap-2">
            <Link to="/login" className="text-decoration-none">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;


