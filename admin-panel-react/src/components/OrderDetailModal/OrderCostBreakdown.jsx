import * as orderUtils from '../../utils/orderUtils';

/**
 * Component hiển thị chi phí và ăn chia
 */
export default function OrderCostBreakdown({ order, shouldHideMoneyFields, originalOrder, pendingMoneyDraft, viewingDraft }) {
  if (!order) return null;
  
  const { formatCurrency, getProfitSharingUserName } = orderUtils;

  if (shouldHideMoneyFields) return null;

  // Helper function để hiển thị giá trị với mũi tên nếu có thay đổi
  const renderValueWithComparison = (label, currentValue, originalValue, formatter = formatCurrency) => {
    const currentNum = Number(currentValue ?? 0);
    const originalNum = Number(originalValue ?? 0);
    
    if (!viewingDraft || !originalOrder || !pendingMoneyDraft || currentNum === originalNum) {
      // Không phải đang xem bản mới, không có draft, hoặc không có thay đổi, hiển thị bình thường
      return (
        <>
          <strong>{label}:</strong> {formatter(currentNum)}
        </>
      );
    }
    
    // Có thay đổi, hiển thị với mũi tên
    return (
      <>
        <strong>{label}:</strong>{' '}
        <span className="text-muted">{formatter(originalNum)}</span>
        {' → '}
        <span className="text-primary fw-semibold">{formatter(currentNum)}</span>
      </>
    );
  };

  return (
    <div className="mb-4">
      <h6 className="border-bottom pb-2">
        <i className="bi bi-cash-stack"></i> Thông tin chi phí
      </h6>
      {(() => {
        // Kiểm tra xem có giá trị nào > 0 hoặc có thay đổi khi đang xem bản mới
        const hasValues = Number(order.paintingPrice) > 0 || Number(order.constructionPrice) > 0 || 
          Number(order.designFee) > 0 || Number(order.extraFeeAmount) > 0 || 
          Number(order.shippingInstallationPrice) > 0 || Number(order.vat) > 0 || 
          Number(order.depositAmount) > 0 || order.includeVat === false;
        
        const hasChanges = viewingDraft && originalOrder && pendingMoneyDraft && (
          Number(order.paintingPrice) !== Number(originalOrder.paintingPrice || 0) ||
          Number(order.constructionPrice) !== Number(originalOrder.constructionPrice || 0) ||
          Number(order.designFee) !== Number(originalOrder.designFee || 0) ||
          Number(order.extraFeeAmount) !== Number(originalOrder.extraFeeAmount || 0) ||
          Number(order.shippingInstallationPrice) !== Number(originalOrder.shippingInstallationPrice || 0) ||
          Number(order.vat) !== Number(originalOrder.vat || 0) ||
          Number(order.depositAmount) !== Number(originalOrder.depositAmount || 0) ||
          order.includeVat !== originalOrder.includeVat
        );
        
        if (!hasValues && !hasChanges) {
          return <p className="text-muted mb-0">Không có thông tin chi phí</p>;
        }
        
        return (
        <>
            {(Number(order.paintingPrice) > 0 || (viewingDraft && originalOrder && Number(order.paintingPrice) !== Number(originalOrder.paintingPrice || 0))) && (
            <div className="mb-2">
                {renderValueWithComparison('Tiền tranh', order.paintingPrice, originalOrder?.paintingPrice)}
            </div>
          )}
            {(Number(order.constructionPrice) > 0 || (viewingDraft && originalOrder && Number(order.constructionPrice) !== Number(originalOrder.constructionPrice || 0))) && (
            <div className="mb-2">
                {renderValueWithComparison('Tiền thi công', order.constructionPrice, originalOrder?.constructionPrice)}
            </div>
          )}
            {(Number(order.designFee) > 0 || (viewingDraft && originalOrder && Number(order.designFee) !== Number(originalOrder.designFee || 0))) && (
            <div className="mb-2">
                {renderValueWithComparison('Tiền thiết kế', order.designFee, originalOrder?.designFee)}
            </div>
          )}
            {(Number(order.extraFeeAmount) > 0 || (viewingDraft && originalOrder && Number(order.extraFeeAmount) !== Number(originalOrder.extraFeeAmount || 0))) && (
            <div className="mb-2">
                {renderValueWithComparison(`Phí phát sinh${order.extraFeeName ? ` (${order.extraFeeName})` : ''}`, order.extraFeeAmount, originalOrder?.extraFeeAmount)}
            </div>
          )}
            {(Number(order.shippingInstallationPrice) > 0 || (viewingDraft && originalOrder && Number(order.shippingInstallationPrice) !== Number(originalOrder.shippingInstallationPrice || 0))) && (
            <div className="mb-2">
                {renderValueWithComparison(
                  `Vận chuyển & lắp đặt${order.customerPaysShipping ? ' (Khách chịu)' : ''}`,
                  order.shippingInstallationPrice,
                  originalOrder?.shippingInstallationPrice
                )}
            </div>
          )}
          {(() => {
            const showVatComparison = viewingDraft && originalOrder && pendingMoneyDraft && 
              (order.includeVat !== originalOrder.includeVat || Number(order.vat) !== Number(originalOrder?.vat || 0));
            
            if (order.includeVat === false) {
              if (showVatComparison && originalOrder.includeVat !== false) {
                return (
                  <div className="mb-2">
                    <strong>VAT:</strong>{' '}
                    <span className="text-muted">{formatCurrency(originalOrder.vat || 0)}</span>
                    {' → '}
                    <span className="text-primary fw-semibold">Chưa tính</span>
                  </div>
                );
              }
              return (
            <div className="mb-2">
              <strong>VAT:</strong> Chưa tính
            </div>
              );
            } else {
              if (Number(order.vat) > 0) {
                if (showVatComparison && originalOrder.includeVat === false) {
                  return (
                    <div className="mb-2">
                      <strong>VAT:</strong>{' '}
                      <span className="text-muted">Chưa tính</span>
                      {' → '}
                      <span className="text-primary fw-semibold">{formatCurrency(order.vat)}</span>
                    </div>
                  );
                }
                return (
                  <div className="mb-2">
                    {renderValueWithComparison('VAT', order.vat, originalOrder?.vat)}
                  </div>
                );
              }
            }
            return null;
          })()}
            {(Number(order.depositAmount) > 0 || (viewingDraft && originalOrder && Number(order.depositAmount) !== Number(originalOrder.depositAmount || 0))) && (
              <div className="mb-2">
                {renderValueWithComparison('Tiền cọc', order.depositAmount, originalOrder?.depositAmount)}
            </div>
          )}
        </>
        );
      })()}

      {(() => {
        const hasProfitSharing = Array.isArray(order.profitSharing) && order.profitSharing.length > 0;
        const hasOriginalProfitSharing = Array.isArray(originalOrder?.profitSharing) && originalOrder.profitSharing.length > 0;
        
        if (hasProfitSharing || hasOriginalProfitSharing) {
          const showComparison = viewingDraft && originalOrder && pendingMoneyDraft;
          
          return (
        <>
          <h6 className="border-bottom pb-2 pt-3">
            <i className="bi bi-people"></i> Ăn chia
          </h6>
              {showComparison && (
                <div className="mb-3">
                  <div className="text-muted small mb-2">
                    <strong>Bản cũ:</strong>
                    {hasOriginalProfitSharing ? (
                      <ul className="mb-0 mt-1 ms-3">
                        {originalOrder.profitSharing.map((entry, idx) => (
                          <li key={entry._id || entry.user?._id || entry.user || idx}>
                            {getProfitSharingUserName(entry)}: {typeof entry.percentage === 'number' ? `${entry.percentage}%` : '0%'} - {formatCurrency(entry.amount)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ms-2">Không có</span>
                    )}
                  </div>
                  <div className="text-primary fw-semibold small">
                    <strong>Bản mới:</strong>
                    {hasProfitSharing ? (
                      <ul className="mb-0 mt-1 ms-3">
                        {order.profitSharing.map((entry, idx) => (
                          <li key={entry.user?._id || entry.user || idx}>
                            {getProfitSharingUserName(entry)}: {typeof entry.percentage === 'number' ? `${entry.percentage}%` : '0%'} - {formatCurrency(entry.amount)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="ms-2">Không có</span>
                    )}
                  </div>
                </div>
              )}
              {!showComparison && hasProfitSharing && (
          <div>
            {order.profitSharing.map((entry, idx) => (
              <div key={entry._id || entry.user?._id || idx} className="mb-2">
                <strong>{getProfitSharingUserName(entry)}:</strong>{' '}
                {typeof entry.percentage === 'number' ? `${entry.percentage}%` : '0%'} - {formatCurrency(entry.amount)}
              </div>
            ))}
          </div>
              )}
        </>
          );
        }
        return null;
      })()}
    </div>
  );
}

