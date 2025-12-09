import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Login.css';
import logoHalo from '../assets/images/logohalo.png';

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    secretCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await api.post('/api/auth/register-admin', submitData);
      if (response.data.success) {
        navigate('/login?message=' + encodeURIComponent('Đăng ký thành công! Vui lòng đăng nhập.'));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoHalo} alt="Halo Logo" style={{ maxWidth: '200px', height: 'auto', marginBottom: '0.25rem' }} />
          <p className="mb-0" style={{ fontSize: '22px', marginTop: '4px', fontWeight: 'bold' }}>Tạo tài khoản quản trị viên</p>
        </div>
        <div className="login-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                className="form-control"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Nhập lại mật khẩu</label>
              <input
                type="password"
                className="form-control"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Mã bí mật Admin</label>
              <input
                type="password"
                className="form-control"
                name="secretCode"
                value={formData.secretCode}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-login w-100"
              disabled={loading}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>
          <div className="text-center mt-3">
            <a href="/login" className="text-decoration-none">
              Đã có tài khoản? Đăng nhập
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

