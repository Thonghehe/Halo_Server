import React from 'react';

const ReturnReasonModal = ({ show, onClose, onConfirm }) => {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (show) setReason('');
  }, [show]);

  if (!show) return null;

  const handleConfirm = () => {
    const trimmed = String(reason).trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="order-detail-modal-overlay" onClick={onClose}>
      <div className="order-detail-modal-dialog" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-arrow-counterclockwise"></i> Lý do khách hoàn hàng
            </h5>
            <button type="button" className="order-detail-modal-close" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            <textarea
              className="form-control"
              rows={4}
              placeholder="Nhập lý do khách hoàn hàng..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="order-detail-modal-footer">
            <div className="d-flex justify-content-end gap-2 w-100">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!String(reason).trim()}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnReasonModal;


