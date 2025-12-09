import * as orderUtils from '../../utils/orderUtils';

/**
 * Component hiển thị chi phí và ăn chia
 */
export default function OrderCostBreakdown({ order, shouldHideMoneyFields }) {
  if (!order) return null;
  
  const { formatCurrency, getProfitSharingUserName } = orderUtils;

  if (shouldHideMoneyFields) return null;

  return (
    <div className="mb-4">
      <h6 className="border-bottom pb-2">
        <i className="bi bi-cash-stack"></i> Thông tin chi phí
      </h6>
      {(Number(order.paintingPrice) > 0 || Number(order.constructionPrice) > 0 || Number(order.designFee) > 0 || Number(order.extraFeeAmount) > 0 || Number(order.shippingInstallationPrice) > 0 || Number(order.vat) > 0 || Number(order.depositAmount) > 0 || (order.cod ?? Math.max(Number(order.totalAmount || 0) - Number(order.depositAmount || 0), 0)) > 0 || order.includeVat === false) ? (
        <>
          {Number(order.paintingPrice) > 0 && (
            <div className="mb-2">
              <strong>Tiền tranh:</strong> {formatCurrency(order.paintingPrice)}
            </div>
          )}
          {Number(order.constructionPrice) > 0 && (
            <div className="mb-2">
              <strong>Tiền thi công:</strong> {formatCurrency(order.constructionPrice)}
            </div>
          )}
          {Number(order.designFee) > 0 && (
            <div className="mb-2">
              <strong>Tiền thiết kế:</strong> {formatCurrency(order.designFee)}
            </div>
          )}
          {Number(order.extraFeeAmount) > 0 && (
            <div className="mb-2">
              <strong>Phí phát sinh{order.extraFeeName ? ` (${order.extraFeeName})` : ''}:</strong> {formatCurrency(order.extraFeeAmount)}
            </div>
          )}
          {Number(order.shippingInstallationPrice) > 0 && (
            <div className="mb-2">
              <strong>
                Vận chuyển &amp; lắp đặt
                {order.customerPaysShipping ? ' (Khách chịu)' : ''}:
              </strong>{' '}
              {formatCurrency(order.shippingInstallationPrice)}
            </div>
          )}
          {order.includeVat === false ? (
            <div className="mb-2">
              <strong>VAT:</strong> Chưa tính
            </div>
          ) : (
            Number(order.vat) > 0 && (
              <div className="mb-2">
                <strong>VAT:</strong> {formatCurrency(order.vat)}
              </div>
            )
          )}
          {Number(order.depositAmount) > 0 && (
            <div className="mb-2">
              <strong>Tiền cọc:</strong> {formatCurrency(order.depositAmount)}
            </div>
          )}
        </>
      ) : (
        <p className="text-muted mb-0">Không có thông tin chi phí</p>
      )}

      {Array.isArray(order.profitSharing) && order.profitSharing.length > 0 && (
        <>
          <h6 className="border-bottom pb-2 pt-3">
            <i className="bi bi-people"></i> Ăn chia
          </h6>
          <div>
            {order.profitSharing.map((entry, idx) => (
              <div key={entry._id || entry.user?._id || idx} className="mb-2">
                <strong>{getProfitSharingUserName(entry)}:</strong>{' '}
                {typeof entry.percentage === 'number' ? `${entry.percentage}%` : '0%'} - {formatCurrency(entry.amount)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

