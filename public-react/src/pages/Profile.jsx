import { useEffect, useState, useMemo } from 'react';
import { Mosaic } from 'react-loading-indicators';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Profile.css';

function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: user?.fullName || '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || ''
      });
    }
  }, [profile?.fullName]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setProfile(response.data.data);
        setError('');
      } else {
        setError(response.data.message || 'Không thể tải thông tin người dùng');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString('vi-VN');
  };

  const ROLE_LABELS = {
    admin: 'Quản trị viên',
    sale: 'Sale',
    in: 'In',
    thietKe: 'Thiết kế',
    marketing: 'Marketing',
    catKhung: 'Cắt khung',
    sanXuat: 'Sản xuất',
    dongGoi: 'Đóng gói',
    keToanDieuDon: 'Kế toán điều đơn',
    keToanTaiChinh: 'Kế toán tài chính'
  };

  const historyEntries = useMemo(() => {
    return (profile?.changeHistory || []).slice(0, 20);
  }, [profile?.changeHistory]);

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

  const formatValue = (value) => {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) {
      if (!value.length) return '—';
      return value
        .map((item, idx) => {
          if (ROLE_LABELS[item]) return ROLE_LABELS[item];
          if (Array.isArray(profile?.roleLabels) && profile.roleLabels[idx]) {
            return profile.roleLabels[idx];
          }
          return item;
        })
        .join(', ');
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

  const renderChanges = (changes) => {
    if (!changes || !Object.keys(changes).length) return null;

    return (
      <ul className="timeline-changes">
        {Object.entries(changes).map(([key, value]) => (
          <li key={key}>
            <span className="change-field">{fieldLabels[key] || key}</span>
            <span className="change-values">
              <span>{formatValue(value?.from)}</span>
              <i className="bi bi-arrow-right mx-2"></i>
              <span>{formatValue(value?.to)}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAlert(null);
    setSavingProfile(true);
    try {
      const response = await updateProfile({
        fullName: editForm.fullName
      });
      if (response.success) {
        setProfile(response.user);
        setAlert({
          type: 'success',
          message: response.message || 'Cập nhật thông tin thành công'
        });
        setShowEditModal(false);
      } else {
        setAlert({
          type: 'danger',
          message: response.message || 'Cập nhật thất bại'
        });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAlert({
        type: 'danger',
        message: 'Mật khẩu xác nhận không khớp'
      });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.success) {
        if (response.user) {
          setProfile(response.user);
        } else {
          await loadProfile();
        }
        setAlert({
          type: 'success',
          message: response.message || 'Đổi mật khẩu thành công'
        });
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setAlert({
          type: 'danger',
          message: response.message || 'Đổi mật khẩu thất bại'
        });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '350px' }}>
        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h2>Thông tin cá nhân</h2>
          <p className="text-muted mb-0">Xem và quản lý thông tin tài khoản của bạn</p>
        </div>
        <span className={`badge ${profile?.active ? 'bg-success' : 'bg-warning'} px-3 py-2`}>
          {profile?.active ? 'Đã kích hoạt' : 'Chờ phê duyệt'}
        </span>
      </div>

      {alert?.message && (
        <div className={`alert alert-${alert.type || 'info'} mb-4`} role="alert">
          {alert.message}
        </div>
      )}

      <div className="profile-actions">
        <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
          <i className="bi bi-pencil-square me-2"></i>Sửa thông tin cá nhân
        </button>
        <button className="btn btn-outline-primary" onClick={() => setShowPasswordModal(true)}>
          <i className="bi bi-shield-lock me-2"></i>Đổi mật khẩu
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar">
            <span>{profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h4 className="mb-1">{profile?.fullName || profile?.email}</h4>
            <p className="mb-0 text-muted">{profile?.email}</p>
          </div>
        </div>

        <div className="profile-card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="profile-info-item">
                <label>Họ và tên</label>
                <p>{profile?.fullName || '-'}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-info-item">
                <label>Email</label>
                <p>{profile?.email || '-'}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-info-item">
                <label>Vai trò</label>
                <div className="d-flex flex-wrap gap-2">
                  {profile?.roles?.length
                    ? profile.roles.map((role, idx) => (
                        <span key={`${role}-${idx}`} className="badge bg-primary">
                          {profile.roleLabels?.[idx] || ROLE_LABELS[role] || role}
                        </span>
                      ))
                    : <span className="text-muted">-</span>}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-info-item">
                <label>Ngày tạo</label>
                <p>{formatDate(profile?.createdAt)}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="profile-info-item">
                <label>Lần cập nhật cuối</label>
                <p>{formatDate(profile?.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-card profile-history-card">
        <div className="profile-card-body">
          <h5 className="mb-4">
            <i className="bi bi-clock-history me-2"></i>Lịch sử thay đổi
          </h5>
          {historyEntries.length === 0 ? (
            <p className="text-muted mb-0">Chưa có thay đổi nào được ghi nhận.</p>
          ) : (
            <div className="profile-timeline">
              {historyEntries.map((entry, index) => (
                <div className="profile-timeline-item" key={`${entry.changedAt}-${index}`}>
                  <div className="profile-timeline-dot"></div>
                  <div className="profile-timeline-content">
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
                    {renderChanges(entry.changes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h5 className="mb-0">
                <i className="bi bi-pencil-square me-2"></i>Sửa thông tin cá nhân
              </h5>
              <button type="button" className="profile-modal-close" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="profile-modal-body">
                <div className="mb-3">
                  <label className="form-label">Họ và tên</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingProfile}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                      </span>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="profile-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h5 className="mb-0">
                <i className="bi bi-shield-lock me-2"></i>Đổi mật khẩu
              </h5>
              <button type="button" className="profile-modal-close" onClick={() => setShowPasswordModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="profile-modal-body">
                <div className="mb-3">
                  <label className="form-label">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={savingPassword}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                      </span>
                      Đang đổi...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check me-2"></i>Xác nhận
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
