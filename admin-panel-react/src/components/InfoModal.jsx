function InfoModal({ show, title = 'Thông báo', message, onClose }) {
  if (!show) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="order-detail-modal-overlay" onClick={handleClose}>
      <div
        className="order-detail-modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-info-circle"></i> {title}
            </h5>
            <button type="button" className="order-detail-modal-close" onClick={handleClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            {message}
          </div>
          <div className="order-detail-modal-footer">
            <button type="button" className="btn btn-primary w-100" onClick={handleClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;

