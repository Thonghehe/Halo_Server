import React from 'react';

const ShippingMethodModal = ({ 
  show, 
  onClose, 
  onConfirm, 
  defaultMethod = '', 
  defaultTrackingCode = '',
  defaultExternalInfo = '',
  defaultShippingInstallationPrice = 0,
  defaultCustomerPaysShipping = false,
  totalAmount = 0,
  depositAmount = 0
}) => {
  const [method, setMethod] = React.useState(defaultMethod || '');
  const [trackingCode, setTrackingCode] = React.useState(defaultTrackingCode || '');
  const [externalInfo, setExternalInfo] = React.useState(defaultExternalInfo || '');
  const [shippingInstallationPrice, setShippingInstallationPrice] = React.useState(
    defaultShippingInstallationPrice || 0
  );
  const [customerPaysShipping, setCustomerPaysShipping] = React.useState(
    defaultCustomerPaysShipping !== undefined ? defaultCustomerPaysShipping : false
  );

  React.useEffect(() => {
    if (show) {
      setMethod(defaultMethod || '');
      setTrackingCode(defaultTrackingCode || '');
      setExternalInfo(defaultExternalInfo || '');
      setShippingInstallationPrice(defaultShippingInstallationPrice || 0);
      setCustomerPaysShipping(defaultCustomerPaysShipping !== undefined ? defaultCustomerPaysShipping : false);
    }
  }, [show, defaultMethod, defaultTrackingCode, defaultExternalInfo, defaultShippingInstallationPrice, defaultCustomerPaysShipping]);

  if (!show) return null;

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^\d]/g, '');
    setShippingInstallationPrice(numericValue ? parseInt(numericValue, 10) : 0);
  };

  const handleConfirm = () => {
    const trimmedMethod = String(method || '').trim();
    if (!trimmedMethod) return;
    
    const payload = {
      shippingMethod: trimmedMethod,
      shippingInstallationPrice: Number(shippingInstallationPrice) || 0,
      customerPaysShipping: customerPaysShipping
    };
    
    if (trimmedMethod === 'viettel') {
      payload.shippingTrackingCode = trackingCode !== undefined && trackingCode !== null ? trackingCode.trim() : '';
      payload.shippingExternalInfo = '';
      payload.shippingExternalCost = 0;
    } else if (trimmedMethod === 'ship_ngoai') {
      payload.shippingTrackingCode = '';
      payload.shippingExternalInfo = externalInfo !== undefined && externalInfo !== null ? externalInfo.trim() : '';
      // Lấy giá trị từ "Vận chuyển & lắp đặt" (đã được gộp)
      payload.shippingExternalCost = Number(shippingInstallationPrice) || 0;
    } else { // khach_den_nhan hoặc di_treo_cho_khach
      payload.shippingTrackingCode = '';
      payload.shippingExternalInfo = '';
      payload.shippingExternalCost = 0;
    }
    
    onConfirm(payload);
  };

  return (
    <div className="order-detail-modal-overlay" onClick={onClose}>
      <div className="order-detail-modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-truck"></i> Nhập hình thức gửi đi
            </h5>
            <button type="button" className="order-detail-modal-close" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="order-detail-modal-body">
            <div className="mb-3">
              <label className="form-label">Chọn hình thức gửi đơn *</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Chưa cập nhật</option>
                <option value="viettel">Viettel Post</option>
                <option value="ship_ngoai">Ship ngoài</option>
                <option value="khach_den_nhan">Khách đến nhận</option>
                <option value="di_treo_cho_khach">Đi treo cho khách</option>
              </select>
            </div>
            
            {method === 'viettel' && (
              <div className="mb-3">
                <label className="form-label">Mã vận đơn (nếu có)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập mã vận đơn"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
            )}
            
            {method === 'ship_ngoai' && (
              <div className="mb-3">
                <label className="form-label">Thông tin ship ngoài</label>
                <textarea
                  className="form-control"
                  placeholder="Ghi chú, tên shipper..."
                  value={externalInfo}
                  onChange={(e) => setExternalInfo(e.target.value)}
                  rows="3"
                />
                <small className="text-muted">Phí ship ngoài đã được gộp vào "Vận chuyển & lắp đặt"</small>
              </div>
            )}
            
            {method === 'khach_den_nhan' && (
              <div className="alert alert-info mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Khách hàng sẽ đến nhận hàng trực tiếp tại cửa hàng.
              </div>
            )}
            
            {method === 'di_treo_cho_khach' && (
              <div className="alert alert-info mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Đi treo tranh trực tiếp tại địa chỉ khách hàng.
              </div>
            )}
            
            {/* Trường chỉnh sửa Vận chuyển & lắp đặt - hiển thị cho tất cả các hình thức gửi */}
            {method && method !== 'khach_den_nhan' && (
              <>
                <div className="mb-3">
                  <label className="form-label">Vận chuyển & lắp đặt (VNĐ)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập số tiền"
                      value={formatCurrency(shippingInstallationPrice)}
                      onChange={handlePriceChange}
                      inputMode="numeric"
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="customerPaysShipping"
                      checked={customerPaysShipping}
                      onChange={(e) => setCustomerPaysShipping(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="customerPaysShipping">
                      Khách chịu
                    </label>
                  </div>
                  
                </div>
              </>
            )}
            
            {/* Hiển thị thông tin COD */}
            {method && (() => {
              // Tính tổng giá trị đơn hàng dựa trên checkbox "Khách chịu"
              // Nếu khách chịu: totalAmount đã bao gồm shippingInstallationPrice (sẽ được tính lại ở backend)
              // Nếu không chịu: totalAmount không bao gồm shippingInstallationPrice (tiền riêng)
              // Ở đây chỉ hiển thị preview, backend sẽ tính lại chính xác
              const calculatedTotalAmount = customerPaysShipping 
                ? (Number(totalAmount || 0) + Number(shippingInstallationPrice || 0))
                : (Number(totalAmount || 0));
              const calculatedCod = Math.max(0, calculatedTotalAmount - Number(depositAmount || 0));
              
              return (
                <div className="mb-3 p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Tổng giá trị đơn hàng:</span>
                    <span className="fw-bold">{calculatedTotalAmount.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  {Number(depositAmount || 0) > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Tiền cọc:</span>
                      <span>{Number(depositAmount || 0).toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center border-top pt-2">
                    <span className="fw-bold">Tiền COD:</span>
                    <span className="fw-bold text-primary">
                      {calculatedCod.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="order-detail-modal-footer">
            <div className="d-flex justify-content-end gap-2 w-100">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!String(method).trim()}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingMethodModal;


