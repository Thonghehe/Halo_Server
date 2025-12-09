import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mosaic } from 'react-loading-indicators';
import api from '../utils/api';
import { useUsers, usePendingUsers, useApproveUser, useRejectUser, useToggleUserActive, useUpdateUserRoles } from '../hooks/useUsers';
import { useDeleteOldOrders } from '../hooks/useOrders';
import '../styles/Users.css';

const AVAILABLE_ROLES = [
  { key: 'sale', label: 'Sale' },
  { key: 'in', label: 'In' },
  { key: 'thietKe', label: 'Thiết kế' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'catKhung', label: 'Cắt khung' },
  { key: 'sanXuat', label: 'Sản xuất' },
  { key: 'dongGoi', label: 'Đóng gói' },
  { key: 'keToanDieuDon', label: 'KT Điều đơn' },
  { key: 'keToanTaiChinh', label: 'KT Tài chính' },
];

function Users() {
  const navigate = useNavigate();
  
  // Sử dụng React Query hooks
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: pendingUsers = [], isLoading: pendingLoading } = usePendingUsers();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const toggleUserActive = useToggleUserActive();
  const updateUserRoles = useUpdateUserRoles();
  const deleteOldOrders = useDeleteOldOrders();
  
  const loading = usersLoading || pendingLoading;
  const error = usersError?.message || '';

  const [activeTab, setActiveTab] = useState('all');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  const [showDeleteOldOrdersModal, setShowDeleteOldOrdersModal] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(null);
  const [secretCodeDelete, setSecretCodeDelete] = useState('');

  const handleApprove = async (userId) => {
    try {
      await approveUser.mutateAsync(userId);
    } catch (err) {
      alert(err.message || 'Không thể phê duyệt user');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn từ chối user này?')) return;
    
    try {
      await rejectUser.mutateAsync(userId);
    } catch (err) {
      alert(err.message || 'Không thể từ chối user');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await toggleUserActive.mutateAsync(userId);
    } catch (err) {
      alert(err.message || 'Không thể thay đổi trạng thái');
    }
  };

  const openEditRoles = (user) => {
    setEditingUser(user);
    setSelectedRoles(user.roles || []);
    setShowRoleModal(true);
  };

  const closeEditRoles = () => {
    setShowRoleModal(false);
    setEditingUser(null);
    setSelectedRoles([]);
  };

  const toggleRole = (roleKey) => {
    setSelectedRoles(prev => (
      prev.includes(roleKey)
        ? prev.filter(r => r !== roleKey)
        : [...prev, roleKey]
    ));
  };

  const saveRoles = async () => {
    if (!editingUser) return;
    if (selectedRoles.length === 0) {
      alert('Vui lòng chọn ít nhất một vai trò');
      return;
    }
    try {
      await updateUserRoles.mutateAsync({
        userId: editingUser._id || editingUser.id,
        roles: selectedRoles
      });
      alert('Cập nhật vai trò thành công');
      closeEditRoles();
    } catch (err) {
      alert(err.message || 'Không thể cập nhật vai trò');
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
      </div>
    );
  }

  const displayUsers = activeTab === 'pending' ? pendingUsers : users;

  const handleDeleteOldOrders = async () => {
    if (!selectedMonths) {
      alert('Vui lòng chọn khoảng thời gian');
      return;
    }

    if (!secretCodeDelete || secretCodeDelete.trim() === '') {
      alert('Vui lòng nhập mã bí mật admin');
      return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa tất cả đơn hàng cũ hơn ${selectedMonths} tháng? Hành động này không thể hoàn tác!`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const result = await deleteOldOrders.mutateAsync({
        months: selectedMonths,
        secretCode: secretCodeDelete.trim()
      });
      alert(result.message || `Đã xóa ${result.deletedCount || 0} đơn hàng`);
      setShowDeleteOldOrdersModal(false);
      setSelectedMonths(null);
      setSecretCodeDelete('');
    } catch (err) {
      alert(err.message || 'Không thể xóa đơn hàng cũ');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 users-header-responsive">
        <h2>{activeTab === 'pending' ? 'Users chờ phê duyệt' : 'Quản lý Users'}</h2>
        <div className="d-flex align-items-center gap-2">
          {pendingUsers.length > 0 && activeTab === 'all' && (
            <span className="badge bg-warning">
              {pendingUsers.length} user chờ duyệt
            </span>
          )}
          {activeTab === 'all' && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowDeleteOldOrdersModal(true)}
            >
              <i className="bi bi-trash"></i> Xóa đơn hàng cũ
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả ({users.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Chờ duyệt ({pendingUsers.length})
          </button>
        </li>
      </ul>

      {/* Table - Desktop View */}
      <div className="card user-table-desktop">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      Không có user nào
                    </td>
                  </tr>
                ) : (
                  displayUsers.map((user) => (
                    <tr 
                      key={user._id || user.id}
                      className="user-row"
                      onClick={() => navigate(`/users/${user._id || user.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>{user.fullName}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        {user.roles?.map((role) => (
                          <span
                            key={role}
                            className={`badge ${getRoleBadgeClass(role)} me-1`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {getVnRoleName(role)}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span 
                          className={`badge ${user.active ? 'bg-success' : 'bg-warning'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {user.active ? 'Đã kích hoạt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {activeTab === 'pending' ? (
                          <>
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={() => handleApprove(user._id || user.id)}
                            >
                              Phê duyệt
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(user._id || user.id)}
                            >
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm btn-warning me-2"
                              onClick={() => handleToggleActive(user._id || user.id)}
                            >
                              {user.active ? 'Khóa' : 'Mở khóa'}
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openEditRoles(user)}
                            >
                              <i className="bi bi-pencil"></i> Sửa vai trò
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Card View - Mobile */}
      <div className="user-card-mobile">
        {displayUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            Không có user nào
          </div>
        ) : (
          displayUsers.map((user) => (
            <div
              key={user._id || user.id}
              className="user-card"
              onClick={() => navigate(`/users/${user._id || user.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-card-header">
                <div className="user-card-name">{user.fullName}</div>
                <span 
                  className={`badge ${user.active ? 'bg-success' : 'bg-warning'} user-card-status`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {user.active ? 'Đã kích hoạt' : 'Chờ duyệt'}
                </span>
              </div>
              <div className="user-card-body">
                <div className="user-card-field">
                  <div className="user-card-label">Email</div>
                  <div className="user-card-value">{user.email}</div>
                </div>
                <div className="user-card-field">
                  <div className="user-card-label">Vai trò</div>
                  <div className="user-card-roles">
                    {user.roles?.map((role) => (
                      <span
                        key={role}
                        className={`badge ${getRoleBadgeClass(role)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getVnRoleName(role)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="user-card-actions" onClick={(e) => e.stopPropagation()}>
                {activeTab === 'pending' ? (
                  <>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleApprove(user._id || user.id)}
                    >
                      Phê duyệt
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleReject(user._id || user.id)}
                    >
                      Từ chối
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleToggleActive(user._id || user.id)}
                    >
                      {user.active ? 'Khóa' : 'Mở khóa'}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openEditRoles(user)}
                    >
                      <i className="bi bi-pencil"></i> Sửa vai trò
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showRoleModal && (
        <div className="order-detail-modal-overlay" onClick={closeEditRoles}>
          <div 
            className="order-detail-modal-dialog"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-detail-modal-content">
              <div className="order-detail-modal-header">
                <h5 className="order-detail-modal-title">
                  <i className="bi bi-person-gear"></i> Sửa vai trò: {editingUser?.fullName}
                </h5>
                <button
                  type="button"
                  className="order-detail-modal-close"
                  onClick={closeEditRoles}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="order-detail-modal-body">
                <div className="mb-3">
                  <div className="row g-2">
                    {AVAILABLE_ROLES.map(r => (
                      <div className="col-12 col-sm-6" key={r.key}>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`role-${r.key}`}
                            checked={selectedRoles.includes(r.key)}
                            onChange={() => toggleRole(r.key)}
                          />
                          <label className="form-check-label" htmlFor={`role-${r.key}`}>
                            {r.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="alert alert-info">
                  Lưu ý: Không thể thay đổi vai trò của Admin từ đây.
                </div>
              </div>
              <div className="order-detail-modal-footer">
                <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 w-100">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeEditRoles}
                    disabled={updateUserRoles.isPending}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveRoles}
                    disabled={updateUserRoles.isPending || selectedRoles.length === 0}
                  >
                    {updateUserRoles.isPending ? (
                      <>
                        <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                        </span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save"></i> Lưu
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa đơn hàng cũ */}
      {showDeleteOldOrdersModal && (
        <div className="order-detail-modal-overlay" onClick={() => setShowDeleteOldOrdersModal(false)}>
          <div 
            className="order-detail-modal-dialog"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-detail-modal-content">
              <div className="order-detail-modal-header">
                <h5 className="order-detail-modal-title">
                  <i className="bi bi-trash"></i> Xóa đơn hàng cũ
                </h5>
                <button
                  type="button"
                  className="order-detail-modal-close"
                  onClick={() => {
                    setShowDeleteOldOrdersModal(false);
                    setSelectedMonths(null);
                  }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="order-detail-modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle"></i> Cảnh báo: Hành động này sẽ xóa vĩnh viễn tất cả đơn hàng cũ hơn khoảng thời gian bạn chọn. Không thể hoàn tác!
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Chọn khoảng thời gian:</label>
                  <div className="d-flex flex-column gap-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="deleteMonths"
                        id="months-24"
                        value={24}
                        checked={selectedMonths === 24}
                        onChange={(e) => setSelectedMonths(parseInt(e.target.value, 10))}
                      />
                      <label className="form-check-label" htmlFor="months-24">
                        2 năm (24 tháng)
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="deleteMonths"
                        id="months-12"
                        value={12}
                        checked={selectedMonths === 12}
                        onChange={(e) => setSelectedMonths(parseInt(e.target.value, 10))}
                      />
                      <label className="form-check-label" htmlFor="months-12">
                        1 năm (12 tháng)
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="deleteMonths"
                        id="months-6"
                        value={6}
                        checked={selectedMonths === 6}
                        onChange={(e) => setSelectedMonths(parseInt(e.target.value, 10))}
                      />
                      <label className="form-check-label" htmlFor="months-6">
                        6 tháng
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="deleteMonths"
                        id="months-3"
                        value={3}
                        checked={selectedMonths === 3}
                        onChange={(e) => setSelectedMonths(parseInt(e.target.value, 10))}
                      />
                      <label className="form-check-label" htmlFor="months-3">
                        3 tháng
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="deleteMonths"
                        id="months-1"
                        value={1}
                        checked={selectedMonths === 1}
                        onChange={(e) => setSelectedMonths(parseInt(e.target.value, 10))}
                      />
                      <label className="form-check-label" htmlFor="months-1">
                        1 tháng
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Mã bí mật Admin</label>
                  <input
                    type="password"
                    className="form-control"
                    value={secretCodeDelete}
                    onChange={(e) => setSecretCodeDelete(e.target.value)}
                    placeholder="Nhập mã bí mật để xác nhận"
                    required
                  />
                </div>
              </div>
              <div className="order-detail-modal-footer">
                <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 w-100">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeleteOldOrdersModal(false);
                      setSelectedMonths(null);
                      setSecretCodeDelete('');
                    }}
                    disabled={deleteOldOrders.isPending}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteOldOrders}
                    disabled={deleteOldOrders.isPending || !selectedMonths}
                  >
                    {deleteOldOrders.isPending ? (
                      <>
                        <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                        </span>
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash"></i> Xóa đơn hàng cũ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;

