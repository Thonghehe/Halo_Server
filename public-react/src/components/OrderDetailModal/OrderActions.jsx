import { Mosaic } from 'react-loading-indicators';

/**
 * Component hiển thị các nút action cho order
 */
export default function OrderActions({
  order,
  canAcceptOrder,
  canCompleteOrder,
  canReceiveProduction,
  canFrameOrder,
  canCancelOrder,
  canMarkReturnOrFix,
  canMarkReceivedBack,
  canMarkPackingReceivedBack,
  canSendBackToProduction,
  canStoreToWarehouse,
  canProductionReceiveAgain,
  canRequestProductionRework,
  canRequestRework,
  canRequestPackingRework,
  canSendBackToCustomer,
  accepting,
  completing,
  receiving,
  framing,
  requestingProduction,
  onAccept,
  onComplete,
  onReceiveProduction,
  onFrame,
  onCancel,
  onMarkReturn,
  onMarkFixRequest,
  onMarkReceivedBack,
  onMarkPackingReceivedBack,
  onSendBackToProduction,
  onStoreToWarehouse,
  onProductionReceiveAgain,
  onRequestProductionReprint,
  onRequestProductionRecut,
  onRequestPackingReprint,
  onRequestReprint,
  onRequestRecut,
  onSendBackToCustomer
}) {
  if (!order) return null;

  const currentStatus = order?.status || 'moi_tao';
  if (currentStatus === 'hoan_thanh' || currentStatus === 'huy') {
    return null;
  }

  return (
    <div className="d-flex gap-2">
      {(() => {
        if (!canAcceptOrder) return null;
        const { canAccept, role } = canAcceptOrder;
        if (canAccept) {
          return (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => onAccept(role)}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                  </span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle"></i> Nhận đơn
                </>
              )}
            </button>
          );
        }
        return null;
      })()}
      {(() => {
        if (!canCompleteOrder) return null;
        const { canComplete, role, label } = canCompleteOrder;
        if (canComplete) {
          return (
            <button 
              type="button" 
              className="btn btn-success"
              onClick={() => onComplete(role)}
              disabled={completing}
            >
              {completing ? (
                <>
                  <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                  </span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle"></i> {label}
                </>
              )}
            </button>
          );
        }
        return null;
      })()}
      {(() => {
        if (!canReceiveProduction) return null;
        const { canReceive, type } = canReceiveProduction;
        return (
          <>
            {canReceive && type === 'tranh' && (
              <button 
                type="button" 
                className="btn btn-info"
                onClick={() => onReceiveProduction('tranh')}
                disabled={receiving}
              >
                {receiving ? (
                  <>
                    <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
                    </span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="bi bi-image"></i> Nhận tranh
                  </>
                )}
              </button>
            )}
          </>
        );
      })()}
      {(() => {
        if (!canRequestProductionRework) return null;
        const { canRequestReprint, canRequestRecut } = canRequestProductionRework;
        return (
          <>
            {canRequestReprint && (
              <button 
                type="button" 
                className="btn btn-outline-warning"
                onClick={onRequestProductionReprint}
                disabled={requestingProduction}
              >
                <i className="bi bi-printer"></i> Yêu cầu in lại
              </button>
            )}
            {canRequestRecut && (
              <button 
                type="button" 
                className="btn btn-outline-warning"
                onClick={onRequestProductionRecut}
                disabled={requestingProduction}
              >
                <i className="bi bi-scissors"></i> Yêu cầu cắt khung lại
              </button>
            )}
          </>
        );
      })()}
      {(() => {
        if (!canRequestPackingRework) return null;
        const { canRequestReprint } = canRequestPackingRework;
        return (
          <>
            {canRequestReprint && (
              <button 
                type="button" 
                className="btn btn-outline-warning"
                onClick={onRequestPackingReprint}
                disabled={requestingProduction}
              >
                <i className="bi bi-printer"></i> Yêu cầu in lại
              </button>
            )}
          </>
        );
      })()}
      {canFrameOrder && (
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={onFrame}
          disabled={framing}
        >
          {framing ? (
            <>
              <span className="me-2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} size="small" />
              </span>
              Đang xử lý...
            </>
          ) : (
            <>
              <i className="bi bi-box-seam"></i> Đã vào khung
            </>
          )}
        </button>
      )}
      {canMarkReturnOrFix ? (
        <>
          <button 
            type="button" 
            className="btn btn-outline-danger"
            onClick={onMarkReturn}
          >
            <i className="bi bi-arrow-counterclockwise"></i> Khách hoàn hàng
          </button>
          <button 
            type="button" 
            className="btn btn-outline-warning"
            onClick={onMarkFixRequest}
          >
            <i className="bi bi-tools"></i> Yêu cầu sửa tranh
          </button>
        </>
      ) : (
        canCancelOrder && (
          <button 
            type="button" 
            className="btn btn-danger"
            onClick={onCancel}
          >
            <i className="bi bi-x-circle"></i> Hủy đơn hàng
          </button>
        )
      )}
      {canMarkReceivedBack && (
        <button 
          type="button" 
          className="btn btn-outline-primary"
          onClick={onMarkReceivedBack}
        >
          <i className="bi bi-arrow-return-left"></i> Đã nhận lại đơn
        </button>
      )}
      {canMarkPackingReceivedBack && (
        <button 
          type="button" 
          className="btn btn-outline-success"
          onClick={onMarkPackingReceivedBack}
        >
          <i className="bi bi-box2"></i> Đóng gói đã nhận lại
        </button>
      )}
      {canSendBackToProduction && (
        <button 
          type="button" 
          className="btn btn-outline-secondary"
          onClick={onSendBackToProduction}
        >
          <i className="bi bi-send"></i> Gửi lại sản xuất
        </button>
      )}
      {canStoreToWarehouse && (
        <button 
          type="button" 
          className="btn btn-outline-secondary"
          onClick={onStoreToWarehouse}
        >
          <i className="bi bi-archive"></i> Cất vào kho
        </button>
      )}
      {canProductionReceiveAgain && (
        <button 
          type="button" 
          className="btn btn-outline-secondary"
          onClick={onProductionReceiveAgain}
        >
          <i className="bi bi-box-arrow-in-down"></i> Nhận lại sản xuất
        </button>
      )}
      {(() => {
        if (!canRequestRework) return null;
        const { canReprint, canRecut } = canRequestRework;
        return (
          <>
            {canReprint && (
              <button 
                type="button" 
                className="btn btn-outline-danger"
                onClick={onRequestReprint}
              >
                <i className="bi bi-printer"></i> Yêu cầu in lại
              </button>
            )}
            {canRecut && (
              <button 
                type="button" 
                className="btn btn-outline-warning"
                onClick={onRequestRecut}
              >
                <i className="bi bi-scissors"></i> Yêu cầu cắt lại khung
              </button>
            )}
            {canSendBackToCustomer && (
              <button 
                type="button" 
                className="btn btn-outline-primary"
                onClick={onSendBackToCustomer}
              >
                <i className="bi bi-send-check"></i> Gửi lại cho khách
              </button>
            )}
          </>
        );
      })()}
    </div>
  );
}

