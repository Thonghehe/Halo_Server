function ConfirmModal({ show, title, message, onClose, onConfirm, loading }) {
  if (!show) return null;
  return (
    <div className="order-detail-modal-overlay" onClick={onClose}>
      <div className="order-detail-modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-question-circle"></i> {title || 'Xác nhận'}
            </h5>
            <button type="button" className="order-detail-modal-close" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            {message}
          </div>
          <div className="order-detail-modal-footer">
            <div className="d-flex justify-content-end gap-2 w-100">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
