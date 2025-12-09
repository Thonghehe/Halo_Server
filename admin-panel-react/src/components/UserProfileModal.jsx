import '../styles/OrderDetailModal.css';

function UserProfileModal({ show, user, onClose, taggedBy, taggedAt }) {
  if (!show || !user) return null;

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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString('vi-VN');
  };

  const renderAvatarLetter = () => {
    if (user.fullName && user.fullName.length > 0) {
      return user.fullName.charAt(0).toUpperCase();
    }
    if (user.email && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const roles = Array.isArray(user.roles) ? user.roles : [];

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="order-detail-modal-overlay" onClick={handleClose}>
      <div className="order-detail-modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title d-flex align-items-center gap-2">
              <i className="bi bi-person-circle"></i>
              <span>Thông tin người dùng</span>
            </h5>
            <button
              type="button"
              className="order-detail-modal-close"
              onClick={handleClose}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="order-detail-modal-body">
            <div className="profile-card mb-3">
              <div className="profile-card-header">
                <div className="profile-avatar">
                  <span>{renderAvatarLetter()}</span>
                </div>
                <div>
                  <h4 className="mb-1">{user.fullName || user.email || 'Người dùng'}</h4>
                  <p className="mb-0 text-muted">{user.email || '—'}</p>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="profile-info-item">
                      <label>Họ và tên</label>
                      <p>{user.fullName || '—'}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="profile-info-item">
                      <label>Email</label>
                      <p>{user.email || '—'}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="profile-info-item">
                      <label>Vai trò</label>
                      <div className="d-flex flex-wrap gap-2">
                        {roles.length > 0 ? (
                          roles.map((role, idx) => (
                            <span key={`${role}-${idx}`} className="badge bg-primary">
                              {ROLE_LABELS[role] || role}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="profile-info-item">
                      <label>Ngày tạo</label>
                      <p>{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="profile-info-item">
                      <label>Lần cập nhật cuối</label>
                      <p>{formatDate(user.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(taggedBy || taggedAt) && (
              <div className="profile-card">
                <div className="profile-card-body">
                  <h6 className="mb-3">
                    <i className="bi bi-at me-2"></i>Thông tin nhắc trong đơn hàng
                  </h6>
                  <div className="profile-info-item mb-2">
                    <label>Thời điểm được nhắc</label>
                    <p>{formatDate(taggedAt)}</p>
                  </div>
                  {taggedBy && (
                    <div className="profile-info-item mb-0">
                      <label>Người nhắc</label>
                      <p>{taggedBy.fullName || taggedBy.email || 'Người dùng'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="order-detail-modal-footer">
            <button
              type="button"
              className="btn btn-secondary w-100"
              onClick={handleClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;


