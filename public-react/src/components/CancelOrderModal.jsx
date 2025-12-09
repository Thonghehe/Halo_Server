import { Mosaic } from 'react-loading-indicators';

function CancelOrderModal({ show, reason, onReasonChange, onClose, onConfirm, loading }) {
  if (!show) return null;

  return (
    <div className="order-detail-modal-overlay" onClick={onClose}>
      <div
        className="order-detail-modal-dialog"
        style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-exclamation-triangle text-danger"></i> Hủy đơn hàng
            </h5>
            <button
              type="button"
              className="order-detail-modal-close"
              onClick={onClose}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            <div className="mb-3">
              <label htmlFor="cancelReason" className="form-label">
                <strong>Lý do hủy đơn hàng <span className="text-danger">*</span></strong>
              </label>
              <textarea
                id="cancelReason"
                className="form-control"
                rows="4"
                placeholder="Nhập lý do hủy đơn hàng..."
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="alert alert-warning">
              <i className="bi bi-info-circle"></i> Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
            </div>
          </div>
          <div className="order-detail-modal-footer">
            <div className="d-flex justify-content-end gap-2 w-100">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirm}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <>
                    <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                    </span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle"></i> Xác nhận hủy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelOrderModal;
