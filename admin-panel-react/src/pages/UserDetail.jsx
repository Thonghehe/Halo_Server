import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mosaic } from 'react-loading-indicators';
import api from '../utils/api';
import '../styles/UserDetail.css';

function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const response = await api.get(`/api/admin/users/${userId}`);
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setError('Không thể tải thông tin user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông tin user');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Bạn có chắc muốn phê duyệt user này?')) return;
    
    try {
      const response = await api.patch(`/api/admin/users/${userId}/approve`);
      if (response.data.success) {
        await loadUser();
        alert('Phê duyệt user thành công');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể phê duyệt user');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Bạn có chắc muốn từ chối user này? Hành động này sẽ xóa user.')) return;
    
    try {
      const response = await api.delete(`/api/admin/users/${userId}/reject`);
      if (response.data.success) {
        navigate('/users');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể từ chối user');
    }
  };

  const handleToggleActive = async () => {
    const action = user.active ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${action} user này?`)) return;
    
    try {
      const response = await api.patch(`/api/admin/users/${userId}/toggle-active`);
      if (response.data.success) {
        await loadUser();
        alert(`${action === 'khóa' ? 'Khóa' : 'Mở khóa'} user thành công`);
      }
    } catch (err) {
      alert(err.response?.data?.message || `Không thể ${action} user`);
    }
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      admin: 'bg-danger',
      sale: 'bg-primary',
      catKhung: 'bg-info',
      sanXuat: 'bg-success',
      dongGoi: 'bg-warning',
      keToanDieuDon: 'bg-secondary',
      keToanTaiChinh: 'bg-dark',
      in: 'bg-primary',
      thietKe: 'bg-light text-dark border border-secondary',
      marketing: 'bg-info text-white'
    };
    return classes[role] || 'bg-secondary';
  };

  const getVnRoleName = (role) => {
    const names = {
      admin: 'Admin',
      sale: 'Sale',
      in: 'In',
      thietKe: 'Thiết kế',
      marketing: 'Marketing',
      catKhung: 'Cắt khung',
      sanXuat: 'Sản xuất',
      dongGoi: 'Đóng gói',
      keToanDieuDon: 'KT Điều đơn',
      keToanTaiChinh: 'KT Tài chính'
    };
    return names[role] || role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const actionLabels = {
    'update-profile': 'Cập nhật thông tin cá nhân',
    'change-password': 'Đổi mật khẩu',
    approve: 'Phê duyệt tài khoản',
    'update-roles': 'Cập nhật vai trò',
    'toggle-active': 'Thay đổi trạng thái tài khoản'
  };

  const fieldLabels = {
    fullName: 'Họ và tên',
    roles: 'Vai trò',
    active: 'Trạng thái',
    approvedBy: 'Người phê duyệt',
    approvedAt: 'Thời gian phê duyệt'
  };

  const isISODateString = (value) => (
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
  );

  const formatChangeValue = (value) => {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) {
      if (!value.length) return '—';
      return value.map((item) => getVnRoleName(item) || item).join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Đang kích hoạt' : 'Đã khóa';
    }
    if (typeof value === 'object') {
      if (value.fullName) return value.fullName;
      if (value.email) return value.email;
      if (value.label) return value.label;
      if (value.toString && value.toString !== Object.prototype.toString) {
        return value.toString();
      }
      return JSON.stringify(value);
    }
    if (isISODateString(value)) {
      return formatDate(value);
    }
    return value.toString();
  };

  const renderHistoryChanges = (changes) => {
    if (!changes || !Object.keys(changes).length) return null;
    return (
      <ul className="user-history-changes">
        {Object.entries(changes).map(([key, value]) => (
          <li key={key}>
            <span className="history-change-field">{fieldLabels[key] || key}</span>
            <span className="history-change-values">
              <span>{formatChangeValue(value?.from)}</span>
              <i className="bi bi-arrow-right mx-2"></i>
              <span>{formatChangeValue(value?.to)}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const historyEntries = user?.changeHistory || [];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Chi tiết User</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/users')}>
            Quay lại
          </button>
        </div>
        <div className="alert alert-danger">
          {error || 'Không tìm thấy user'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Chi tiết User</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/users')}>
          <i className="bi bi-arrow-left"></i> Quay lại
        </button>
      </div>

      <div className="user-detail-container">
        {/* Thông tin cơ bản */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">
              <i className="bi bi-person-circle me-2"></i>
              Thông tin cơ bản
            </h5>
            <div className="user-info-grid">
              <div className="info-item">
                <div className="info-label">Họ và tên</div>
                <div className="info-value">{user.fullName}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Email</div>
                <div className="info-value">{user.email}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Trạng thái</div>
                <div className="info-value">
                  <span className={`badge ${user.active ? 'bg-success' : 'bg-warning'}`}>
                    {user.active ? 'Đã kích hoạt' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Ngày tạo</div>
                <div className="info-value">{formatDate(user.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vai trò */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">
              <i className="bi bi-shield-check me-2"></i>
              Vai trò
            </h5>
            <div className="roles-container">
              {user.roles?.map((role) => (
                <span
                  key={role}
                  className={`badge ${getRoleBadgeClass(role)} me-2 mb-2`}
                  style={{ fontSize: '0.9rem', padding: '0.5em 0.75em' }}
                >
                  {getVnRoleName(role)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Thông tin phê duyệt */}
        {user.approvedBy && (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">
                <i className="bi bi-check-circle me-2"></i>
                Thông tin phê duyệt
              </h5>
              <div className="user-info-grid">
                <div className="info-item">
                  <div className="info-label">Người phê duyệt</div>
                  <div className="info-value">{user.approvedBy.fullName}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Email người phê duyệt</div>
                  <div className="info-value">{user.approvedBy.email}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Ngày phê duyệt</div>
                  <div className="info-value">{formatDate(user.approvedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thao tác */}
        <div className="card">
          <div className="card-body">
            <h5 className="card-title mb-4">
              <i className="bi bi-gear me-2"></i>
              Thao tác
            </h5>
            <div className="user-actions">
              {!user.active && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={handleApprove}
                  >
                    <i className="bi bi-check-circle"></i> Phê duyệt
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleReject}
                  >
                    <i className="bi bi-x-circle"></i> Từ chối
                  </button>
                </>
              )}
              {user.active && (
                <button
                  className={`btn ${user.active ? 'btn-warning' : 'btn-success'}`}
                  onClick={handleToggleActive}
                >
                  <i className={`bi ${user.active ? 'bi-lock' : 'bi-unlock'}`}></i>
                  {user.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                </button>
              )}
            </div>
          </div>
        </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4">
            <i className="bi bi-clock-history me-2"></i>
            Lịch sử thay đổi
          </h5>
          {historyEntries.length === 0 ? (
            <p className="text-muted mb-0">Chưa có lịch sử thay đổi nào được ghi nhận.</p>
          ) : (
            <div className="user-history-timeline">
              {historyEntries.slice(0, 30).map((entry, index) => (
                <div className="user-history-item" key={`${entry.changedAt}-${index}`}>
                  <div className="user-history-dot"></div>
                  <div className="user-history-content">
                    <div className="d-flex justify-content-between flex-wrap gap-2 mb-1">
                      <div className="d-flex flex-column">
                        <strong>{actionLabels[entry.action] || entry.action}</strong>
                        {entry.description && <span className="text-muted">{entry.description}</span>}
                      </div>
                      <span className="text-muted small">{formatDate(entry.changedAt)}</span>
                    </div>
                    <div className="text-muted small mb-2">
                      Thực hiện bởi: {entry.changedBy?.fullName || entry.changedBy?.email || 'Hệ thống'}
                    </div>
                    {renderHistoryChanges(entry.changes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default UserDetail;

