import * as orderUtils from '../../utils/orderUtils';

/**
 * Component hiển thị header của order (order code, status, customer info)
 */
export default function OrderHeader({ order, shouldHideMoneyFields }) {
  if (!order) return null;
  
  const {
    getVnStatusName,
    getStatusBadgeClass,
    getVnOrderTypeName,
    getOrderTypeBadgeClass,
    getVnPrintingStatusName,
    getPrintingStatusBadgeClass,
    getVnFrameCuttingStatusName,
    getFrameCuttingStatusBadgeClass,
    formatDateTime,
    getShippingMethodLabel,
    getImageUrl
  } = orderUtils;

  return (
    <div className="row mb-4">
      <div className="col-md-6">
        <h4 className="mb-3">
          <span className="badge bg-primary">{order.orderCode}</span>
        </h4>
        <div className="mb-2">
          <strong>Loại đơn:</strong>{' '}
          <span className={`badge ${getOrderTypeBadgeClass(order.orderType)}`}>
            {getVnOrderTypeName(order.orderType)}
          </span>
        </div>
        <div className="mb-2">
          <strong>Trạng thái:</strong>{' '}
          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
            {getVnStatusName(order.status)}
          </span>
        </div>
        <div className="mb-2">
          <strong>In:</strong>{' '}
          <span className={`badge ${getPrintingStatusBadgeClass(order.printingStatus || 'chua_in')}`}>
            {getVnPrintingStatusName(order.printingStatus || 'chua_in')}
          </span>
        </div>
        {/*
        <div className="mb-2">
          <strong>Cắt khung:</strong>{' '}
          <span className={`badge ${getFrameCuttingStatusBadgeClass(order.frameCuttingStatus || 'chua_cat')}`}>
            {getVnFrameCuttingStatusName(order.frameCuttingStatus || 'chua_cat')}
          </span>
        </div>
        */}
        {!shouldHideMoneyFields && (
          <>
            <div className="mb-2">
              <strong>Tổng giá trị:</strong>{' '}
              {typeof order.totalAmount === 'number'
                ? `${order.totalAmount.toLocaleString('vi-VN')} VNĐ`
                : '-'}
            </div>
            <div className="mb-2">
              <strong>COD:</strong>{' '}
              {typeof order.cod === 'number'
                ? `${order.cod.toLocaleString('vi-VN')} VNĐ`
                : (() => {
                    const deposit = Number(order.depositAmount || 0);
                    const total = Number(order.totalAmount || 0);
                    const cod = Math.max(total - deposit, 0);
                    return `${cod.toLocaleString('vi-VN')} VNĐ`;
                  })()}
            </div>
          </>
        )}
        <div className="mb-2">
          <strong>Hình thức gửi:</strong>{' '}
          {getShippingMethodLabel(order.shippingMethod)}
        </div>
        {order.shippingTrackingCode && order.shippingTrackingCode.trim() && (
          <div className="mb-2">
            <strong>Mã đơn vận:</strong> {order.shippingTrackingCode}
          </div>
        )}
        {order.shippingExternalInfo && order.shippingExternalInfo.trim() && (
          <div className="mb-2">
            <strong>Thông tin vận chuyển bên ngoài:</strong>{' '}
            <span className="text-muted">{order.shippingExternalInfo}</span>
          </div>
        )}
        <div>
          <strong>Ngày tạo:</strong> {formatDateTime(order.createdAt)}
        </div>
        {order.status === 'hoan_thanh' && order.actualCompletionDate && (
          <div>
            <strong>Ngày hoàn thành:</strong> {formatDateTime(order.actualCompletionDate)}
          </div>
        )}
        {/* Hiển thị bill thanh toán cho đơn "Khách đến nhận" đã hoàn thành */}
        {order.status === 'hoan_thanh' && 
         order.shippingMethod === 'khach_den_nhan' && 
         Array.isArray(order.paymentBillImages) && 
         order.paymentBillImages.length > 0 && (
          <div className="mt-3">
            <strong className="d-block mb-2">
              <i className="bi bi-receipt me-2"></i>Bill thanh toán:
            </strong>
            <div className="d-flex flex-wrap gap-2">
              {order.paymentBillImages.map((img, index) => {
                const imageUrl = getImageUrl(img, 'payment-bills');
                if (!imageUrl) return null;
                return (
                  <div
                    key={`${img}-${index}`}
                    className="position-relative"
                    style={{ width: 120, height: 120 }}
                  >
                    <img
                      src={imageUrl}
                      alt={`Bill thanh toán ${index + 1}`}
                      className="img-thumbnail w-100 h-100"
                      style={{ 
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(imageUrl, '_blank')}
                      title="Click để xem ảnh lớn"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="col-md-6">
        <h6 className="text-muted mb-3">Thông tin khách hàng</h6>
        <div className="mb-2">
          <i className="bi bi-person"></i> <strong>Tên:</strong>{' '}
          {order.customerName || '-'}
        </div>
        <div className="mb-2">
          <i className="bi bi-telephone"></i> <strong>SĐT/Zalo:</strong>{' '}
          {order.customerPhone || '-'}
        </div>
        <div>
          <i className="bi bi-geo-alt"></i> <strong>Địa chỉ:</strong>{' '}
          {order.customerAddress || '-'}
        </div>
      </div>
    </div>
  );
}

