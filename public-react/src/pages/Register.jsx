import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Login.css';
import logoHalo from '../assets/images/logohalo.png';

// Danh sách roles có sẵn (trừ admin)
const AVAILABLE_ROLES = [
  { value: 'sale', label: 'Sale' },
  { value: 'in', label: 'In' },
  { value: 'thietKe', label: 'Thiết kế' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'catKhung', label: 'Cắt khung' },
  { value: 'sanXuat', label: 'Sản xuất' },
  { value: 'dongGoi', label: 'Đóng gói' },
  { value: 'keToanDieuDon', label: 'Kế toán điều đơn' },
  { value: 'keToanTaiChinh', label: 'Kế toán tài chính' }
];

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roles: ['sale']
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

  const handleRoleChange = (roleValue) => {
    setFormData(prev => {
      const currentRoles = prev.roles || [];
      if (currentRoles.includes(roleValue)) {
        // Bỏ chọn role nếu đã được chọn
        return {
          ...prev,
          roles: currentRoles.filter(r => r !== roleValue)
        };
      } else {
        // Thêm role nếu chưa được chọn
        return {
          ...prev,
          roles: [...currentRoles, roleValue]
        };
      }
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
    
    // Validate roles
    if (!formData.roles || formData.roles.length === 0) {
      setError('Vui lòng chọn ít nhất một vai trò');
      return;
    }
    
    setLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await api.post('/api/auth/register', submitData);
      if (response.data.success) {
        navigate('/login?message=' + encodeURIComponent('Đăng ký thành công! Vui lòng chờ admin phê duyệt.'));
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
          <p className="mb-0" style={{ fontSize: '22px', marginTop: '4px', fontWeight: 'bold' }}>Tạo tài khoản mới</p>
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
            <div className="mb-3 roles-form-group">
              <label className="form-label">Vai trò *</label>
              <div className="roles-selection">
                {AVAILABLE_ROLES.map((role) => (
                  <label 
                    key={role.value} 
                    className={`role-checkbox ${formData.roles?.includes(role.value) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.roles?.includes(role.value) || false}
                      onChange={() => handleRoleChange(role.value)}
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
              {formData.roles?.length === 0 && (
                <small className="text-danger">Vui lòng chọn ít nhất một vai trò</small>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-login w-100"
              disabled={loading || !formData.roles || formData.roles.length === 0}
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>
          <div className="text-center mt-3">
            <Link to="/login" className="text-decoration-none">
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

