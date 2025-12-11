import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mosaic } from 'react-loading-indicators';
import '../styles/OrderDetailModal.css';
import CancelOrderModal from './CancelOrderModal';
import ShippingMethodModal from './ShippingMethodModal';
import PaymentBillModal from './PaymentBillModal';
import ReturnReasonModal from './ReturnReasonModal';
import ReasonModal from './ReasonModal';
import ConfirmModal from './ConfirmModal';
import InfoModal from './InfoModal';
import UserProfileModal from './UserProfileModal';
import OrderHeader from './OrderDetailModal/OrderHeader';
import OrderCostBreakdown from './OrderDetailModal/OrderCostBreakdown';
import OrderPaintingsList from './OrderDetailModal/OrderPaintingsList';
import OrderActions from './OrderDetailModal/OrderActions';
import { useOrderDetail, useOrderDraftView } from '../hooks/useOrderDetail';
import { useOrderMentions } from '../hooks/useOrderMentions';
import { useOrderDraft } from '../hooks/useOrderDraft';
import { useOrderStatusActions } from '../hooks/useOrderStatusActions';
import { useOrderStatusChanges } from '../hooks/useOrderStatusChanges';
import { useOrderPermissions } from '../hooks/useOrderPermissions';
import { useModalState } from '../hooks/useModalState';
import * as orderUtils from '../utils/orderUtils';

function OrderDetailModal({ orderId, show, onClose, onOrderUpdated }) {
  const { user } = useAuth();
  
  // Custom hooks
  const { order, loading, loadOrderDetail, refreshOrder } = useOrderDetail(orderId, show, onOrderUpdated);
  const { isAdmin, pendingMoneyDraft, viewingDraft, setViewingDraft, displayOrder } = useOrderDraftView(order, user);
  const { orderNoteMentions, getPaintingMentions } = useOrderMentions(displayOrder);
  const {
    draftActionLoading,
    showRejectDraftBox,
    setShowRejectDraftBox,
    rejectDraftReason,
    setRejectDraftReason,
    approveDraft,
    rejectDraft,
    formatCurrency,
    renderDraftMoneyRow
  } = useOrderDraft(orderId, async () => {
    await refreshOrder();
    if (onOrderUpdated) onOrderUpdated();
  });
  const {
    accepting,
    completing,
    receiving,
    framing,
    cancelling,
    acceptOrder,
    completeOrder,
    receiveOrder,
    frameOrder,
    cancelOrder,
    markFixRequest
  } = useOrderStatusActions(orderId, async () => {
    await refreshOrder();
    if (onOrderUpdated) onOrderUpdated();
  });
  const {
    requestingRework,
    requestingProduction,
    markReceivedBack,
    markPackingReceivedBack,
    sendBackToCustomer,
    sendBackToProduction,
    storeToWarehouse,
    productionReceiveAgain,
    requestReprint,
    requestRecut,
    markReturn,
    productionRequest
  } = useOrderStatusChanges(orderId, async () => {
    await refreshOrder();
    if (onOrderUpdated) onOrderUpdated();
  });
  const {
    canAcceptOrder,
    canCompleteOrder,
    canReceiveProduction,
    canFrameOrder,
    shouldHideMoneyFields,
    canCancelOrder,
    canMarkReturnOrFix,
    canMarkReceivedBack,
    canMarkPackingReceivedBack,
    isReturnedOrder,
    canSendBackToCustomer,
    canSendBackToProduction,
    canStoreToWarehouse,
    canProductionReceiveAgain,
    canRequestProductionRework,
    canRequestRework,
    canRequestPackingRework
  } = useOrderPermissions(order, user);
  const {
    infoModal,
    confirmModal,
    showNotification,
    closeInfoModal,
    showConfirm,
    closeConfirm
  } = useModalState();

  // Local state cho các modal khác
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReprintReasonModal, setShowReprintReasonModal] = useState(false);
  const [showRecutReasonModal, setShowRecutReasonModal] = useState(false);
  const [showFixRequestReasonModal, setShowFixRequestReasonModal] = useState(false);
  const [showSendBackReasonModal, setShowSendBackReasonModal] = useState(false);
  const [showProductionRequestReprintModal, setShowProductionRequestReprintModal] = useState(false);
  const [showProductionRequestRecutModal, setShowProductionRequestRecutModal] = useState(false);
  const [mentionUserModal, setMentionUserModal] = useState({ show: false, user: null, taggedBy: null, taggedAt: null });

  // Helper functions - sử dụng từ utils
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
    getVnPaintingTypeName,
    getImageUrl,
    getProfitSharingUserName,
    isImageFile,
    getFileIcon,
    getFileColor
  } = orderUtils;

  const handleClickAccept = (role) => {
    if (!order || !user) return;
    const roleNames = {
      'in': 'In',
      'catKhung': 'Cắt khung',
      'dongGoi': 'Đóng gói',
      'keToanDieuDon': 'Kế toán điều đơn'
    };
    showConfirm(
      'Xác nhận nhận đơn',
      `Bạn có chắc chắn muốn nhận đơn hàng này để ${roleNames[role] || 'xử lý'}?`,
      async () => {
        try {
          await acceptOrder(role, showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Nhận đơn hàng thất bại', 'Lỗi');
        }
      },
      accepting
    );
  };

  const handleApproveMoneyDraft = async () => {
    if (!pendingMoneyDraft) return;
    try {
      await approveDraft(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Phê duyệt thất bại', 'Lỗi');
    }
  };

  const handleRejectMoneyDraft = async () => {
    if (!pendingMoneyDraft) return;
    try {
      await rejectDraft(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Từ chối thất bại', 'Lỗi');
    }
  };

  const handleClose = () => {
    // Gọi callback để reload danh sách khi đóng modal
    if (onOrderUpdated) {
      onOrderUpdated();
    }
    if (onClose) {
      onClose();
    }
  };

  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showPaymentBillModal, setShowPaymentBillModal] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  const handleCompleteOrder = async (role, shippingInfo) => {
    if (!order || !user) return;
    try {
      await completeOrder(role, shippingInfo, showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Đánh dấu hoàn thành thất bại', 'Lỗi');
    }
  };

  const handleClickComplete = (role) => {
    if (!order || !user) return;
    if (role === 'keToanDieuDon') {
      // Kiểm tra nếu sale chưa nhập hình thức gửi đơn, hiện modal để nhập
      const currentShippingMethod = order?.shippingMethod;
      if (!currentShippingMethod || String(currentShippingMethod).trim() === '') {
        setPendingRole(role);
        setShowShippingModal(true);
        return;
      }
      // Nếu đã có hình thức gửi đơn, vẫn hiện modal để cho phép sửa hoặc xác nhận
      setPendingRole(role);
      setShowShippingModal(true);
      return;
    }

    if (role === 'sale') {
      setPendingRole(role);
      setShowPaymentBillModal(true);
      return;
    }
    
    // Kiểm tra nếu đang ở trạng thái chờ in lại hoặc chờ cắt lại, sử dụng accept endpoint
    const printingStatus = order?.printingStatus || 'chua_in';
    const frameCuttingStatus = order?.frameCuttingStatus || 'chua_cat';
    
    if (role === 'in' && printingStatus === 'cho_in_lai') {
      showConfirm(
        'Xác nhận hoàn thành',
        'Bạn có chắc chắn muốn đánh dấu "Đã in lại" cho đơn hàng này?',
        async () => {
          try {
            await acceptOrder(role, showNotification);
          } catch (err) {
            showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
          }
        },
        accepting
      );
      return;
    }
    
    if (role === 'catKhung' && frameCuttingStatus === 'cho_cat_lai_khung') {
      showConfirm(
        'Xác nhận hoàn thành',
        'Bạn có chắc chắn muốn đánh dấu "Đã cắt lại khung" cho đơn hàng này?',
        async () => {
          try {
            await acceptOrder(role, showNotification);
          } catch (err) {
            showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
          }
        },
        accepting
      );
      return;
    }
    
    // Các trường hợp khác sử dụng complete endpoint
    const roleLabels = {
      'in': 'Đã in',
      'catKhung': 'Đã cắt khung',
      'dongGoi': 'Đã đóng gói',
      'keToanTaiChinh': 'Đã hoàn thành đơn hàng'
    };
    showConfirm(
      'Xác nhận hoàn thành',
      `Bạn có chắc chắn muốn đánh dấu "${roleLabels[role] || 'hoàn thành'}" cho đơn hàng này?`,
      async () => {
        try {
          await handleCompleteOrder(role, null);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      completing
    );
  };

  const handleConfirmShippingMethod = async (shippingInfo) => {
    setShowShippingModal(false);
    const role = pendingRole || 'keToanDieuDon';
    setPendingRole(null);
    const payload = shippingInfo && typeof shippingInfo === 'object' ? shippingInfo : {};
    await handleCompleteOrder(role, payload);
  };

  const handleConfirmPaymentBills = async (images) => {
    setShowPaymentBillModal(false);
    const role = pendingRole || 'sale';
    setPendingRole(null);
    try {
      await completeOrder(role, { paymentBillImages: images }, showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  // Kiểm tra sản xuất có thể nhận tranh/khung không
  const handleClickReceiveProduction = (type) => {
    if (!order || !user) return;
    showConfirm(
      'Xác nhận nhận',
      `Bạn có chắc chắn muốn nhận ${type === 'tranh' ? 'tranh' : 'khung'} cho đơn hàng này?`,
      async () => {
        try {
          await receiveOrder(type, showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || `Nhận ${type === 'tranh' ? 'tranh' : 'khung'} thất bại`, 'Lỗi');
        }
      },
      receiving
    );
  };

  const handleProductionRequest = async (type, reason) => {
    if (!order || !user) return;
    try {
      await productionRequest(type, reason, showNotification);
      if (type === 'yeu_cau_in_lai') {
        setShowProductionRequestReprintModal(false);
      } else {
        setShowProductionRequestRecutModal(false);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickFrame = () => {
    if (!order || !user) return;
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn đánh dấu "Đã vào khung" cho đơn hàng này?',
      async () => {
        try {
          await frameOrder(showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Đánh dấu "Đã vào khung" thất bại', 'Lỗi');
        }
      },
      framing
    );
  };

  const handleMarkReceivedBack = async () => {
    if (!order || !user) return;
    try {
      await markReceivedBack(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickMarkReceivedBack = () => {
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn chuyển trạng thái sang "Đã nhận lại đơn"?',
      async () => {
        try {
          await handleMarkReceivedBack();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      false
    );
  };

  const handleMarkPackingReceivedBack = async () => {
    if (!order || !user) return;
    try {
      await markPackingReceivedBack(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickMarkPackingReceivedBack = () => {
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn chuyển trạng thái sang "Đóng gói đã nhận lại"?',
      async () => {
        try {
          await handleMarkPackingReceivedBack();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      false
    );
  };

  const handleSendBackToCustomer = async (reason) => {
    if (!order || !user) return;
    try {
      await sendBackToCustomer(reason, showNotification);
      setShowSendBackReasonModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickSendBackToCustomer = () => {
    setShowSendBackReasonModal(true);
  };

  const handleSendBackToProduction = async () => {
    if (!order || !user) return;
    try {
      await sendBackToProduction(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickSendBackToProduction = () => {
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn gửi lại đơn hàng cho sản xuất?',
      async () => {
        try {
          await handleSendBackToProduction();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      false
    );
  };

  const handleStoreToWarehouse = async () => {
    if (!order || !user) return;
    try {
      await storeToWarehouse(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickStoreToWarehouse = () => {
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn cất đơn hàng vào kho?',
      async () => {
        try {
          await handleStoreToWarehouse();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      false
    );
  };

  const handleProductionReceiveAgain = async () => {
    if (!order || !user) return;
    try {
      await productionReceiveAgain(showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickProductionReceiveAgain = () => {
    showConfirm(
      'Xác nhận',
      'Bạn có chắc chắn muốn chuyển trạng thái sang "Chờ sản xuất lại"?',
      async () => {
        try {
          await handleProductionReceiveAgain();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      false
    );
  };

  const handleRequestReprint = async (reason) => {
    if (!order || !user) return;
    try {
      await requestReprint(reason, showNotification);
      setShowReprintReasonModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickRequestReprint = () => {
    setShowReprintReasonModal(true);
  };

  const handleRequestRecut = async (reason) => {
    if (!order || !user) return;
    try {
      await requestRecut(reason, showNotification);
      setShowRecutReasonModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickRequestRecut = () => {
    setShowRecutReasonModal(true);
  };

  const handleMarkReturn = () => {
    setShowReturnModal(true);
  };

  const handleConfirmReturnReason = async (reason) => {
    setShowReturnModal(false);
    if (!order || !user) return;
    try {
      await markReturn(reason, showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleMarkFixRequest = async (reason) => {
    if (!order || !user) return;
    try {
      await markFixRequest(reason, showNotification);
      setShowFixRequestReasonModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickMarkFixRequest = () => {
    setShowFixRequestReasonModal(true);
  };

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    
    if (!cancelReason.trim()) {
      showNotification('Vui lòng nhập lý do hủy đơn hàng');
      return;
    }
    
    try {
      await cancelOrder(cancelReason, showNotification);
      handleCloseCancelModal();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Hủy đơn hàng thất bại', 'Lỗi');
    }
  };

  if (!show) return null;

  return (
    <>
    <div
      className="order-detail-modal-overlay"
      onClick={handleClose}
    >
      <div 
        className="order-detail-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="order-detail-modal-content">
          <div className="order-detail-modal-header">
            <h5 className="order-detail-modal-title">
              <i className="bi bi-box-seam"></i> Chi tiết đơn hàng
            </h5>
            <button 
              type="button" 
              className="order-detail-modal-close" 
              onClick={handleClose}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          
          <div className="order-detail-modal-body">
            {loading ? (
              <div className="order-detail-loading">
                <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
                <p className="mt-2">Đang tải thông tin đơn hàng...</p>
              </div>
            ) : order ? (
              <>
                {/* Draft View Switch - Chỉ hiển thị khi có pending draft và là admin */}
                {pendingMoneyDraft && isAdmin && (
                  <div className="card mb-4 border-warning">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id="draftViewSwitch"
                              checked={viewingDraft}
                              onChange={(e) => setViewingDraft(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="draftViewSwitch">
                              <strong>
                                {viewingDraft ? 'Đang xem bản sửa' : 'Đang xem bản cũ'}
                              </strong>
                            </label>
                          </div>
                          {viewingDraft && (
                            <div className="text-muted">
                              <small>
                                <i className="bi bi-person"></i> Sửa bởi:{' '}
                                {pendingMoneyDraft.createdBy?.fullName ||
                                  pendingMoneyDraft.createdBy?.email ||
                                  'Người dùng'}
                                {' - '}
                                {pendingMoneyDraft.createdAt
                                  ? new Date(pendingMoneyDraft.createdAt).toLocaleString('vi-VN')
                                  : '-'}
                              </small>
                            </div>
                          )}
                        </div>
                        {viewingDraft && (
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={handleApproveMoneyDraft}
                              disabled={draftActionLoading}
                            >
                              {draftActionLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Đang phê duyệt...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check2-circle me-1"></i> Phê duyệt
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setShowRejectDraftBox((prev) => !prev)}
                              disabled={draftActionLoading}
                            >
                              <i className="bi bi-x-circle me-1"></i> Không phê duyệt
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Header */}
                <OrderHeader order={displayOrder} shouldHideMoneyFields={shouldHideMoneyFields} />

                {/* Reject Draft Box - Hiển thị khi click "Không phê duyệt" */}
                {showRejectDraftBox && (
                  <div className="card mb-4 border-danger">
                    <div className="card-body">
                      <h6 className="text-danger border-bottom pb-2">
                        <i className="bi bi-x-circle"></i> Từ chối thay đổi
                      </h6>
                      <div className="mb-2">
                        <label className="form-label">
                          <strong>Lý do không phê duyệt:</strong>
                        </label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={rejectDraftReason}
                          onChange={(e) => setRejectDraftReason(e.target.value)}
                          placeholder="Nhập lý do không phê duyệt thay đổi..."
                        />
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={handleRejectMoneyDraft}
                          disabled={draftActionLoading || !rejectDraftReason.trim()}
                        >
                          {draftActionLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Đang từ chối...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-x-circle me-1"></i> Xác nhận từ chối
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setShowRejectDraftBox(false);
                            setRejectDraftReason('');
                          }}
                          disabled={draftActionLoading}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Money Draft - Chỉ hiển thị khi không có switch (tức là không phải admin hoặc không có draft) */}
                {pendingMoneyDraft && !isAdmin && (
                  <div className="card mb-4 border-warning">
                    <div className="card-body">
                      <h6 className="text-warning border-bottom pb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-hourglass-split"></i>
                        <span>Yêu cầu duyệt thay đổi tiền</span>
                      </h6>
                      <div className="mb-2">
                        <strong>Sale đề xuất:</strong>{' '}
                        {pendingMoneyDraft.createdBy?.fullName ||
                          pendingMoneyDraft.createdBy?.email ||
                          'Người dùng'}
                      </div>
                      <div className="mb-2">
                        <strong>Thời gian:</strong>{' '}
                        {pendingMoneyDraft.createdAt
                          ? new Date(pendingMoneyDraft.createdAt).toLocaleString('vi-VN')
                          : '-'}
                      </div>
                      {renderDraftMoneyRow(
                        'Tiền tranh',
                        order.paintingPrice,
                        pendingMoneyDraft.paintingPrice
                      )}
                      {renderDraftMoneyRow(
                        'Tiền thi công',
                        order.constructionPrice,
                        pendingMoneyDraft.constructionPrice
                      )}
                      {renderDraftMoneyRow(
                        'Vận chuyển & lắp đặt',
                        order.shippingInstallationPrice,
                        pendingMoneyDraft.shippingInstallationPrice
                      )}
                      {pendingMoneyDraft.includeVat !== undefined &&
                        pendingMoneyDraft.includeVat !== order.includeVat && (
                          <div className="mb-2">
                            <strong>Tính VAT:</strong>{' '}
                            {order.includeVat ? 'Có' : 'Không'} {' → '}{' '}
                            <span className="text-primary fw-semibold">
                              {pendingMoneyDraft.includeVat ? 'Có' : 'Không'}
                            </span>
                          </div>
                        )}
                      {renderDraftMoneyRow(
                        'Tiền cọc',
                        order.depositAmount,
                        pendingMoneyDraft.depositAmount
                      )}
                      {Array.isArray(pendingMoneyDraft.profitSharing) &&
                        pendingMoneyDraft.profitSharing.length > 0 && (
                          <div className="mb-2">
                            <strong>Ăn chia đề xuất:</strong>
                            <ul className="mb-0 mt-2">
                              {pendingMoneyDraft.profitSharing.map((entry, idx) => (
                                <li key={entry.user?._id || entry.user || idx}>
                                  {(entry.user?.fullName || entry.user?.email || 'Người dùng') +
                                    ': ' +
                                    (typeof entry.percentage === 'number'
                                      ? `${entry.percentage}%`
                                      : '0%') +
                                    ' - ' +
                                    formatCurrency(entry.amount)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={handleApproveMoneyDraft}
                          disabled={draftActionLoading}
                        >
                          {draftActionLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Đang phê duyệt...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check2-circle me-1"></i> Phê duyệt
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setShowRejectDraftBox((prev) => !prev)}
                          disabled={draftActionLoading}
                        >
                          <i className="bi bi-x-circle me-1"></i> Không phê duyệt
                        </button>
                      </div>
                      {showRejectDraftBox && (
                        <div className="mt-3">
                          <label className="form-label">Lý do không phê duyệt</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={rejectDraftReason}
                            onChange={(e) => setRejectDraftReason(e.target.value)}
                            placeholder="Nhập lý do để sale biết cần chỉnh gì..."
                          />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm mt-2"
                            onClick={handleRejectMoneyDraft}
                            disabled={draftActionLoading}
                          >
                            {draftActionLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-send-exclamation me-1"></i> Xác nhận từ chối
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Paintings List */}
                {displayOrder.paintings && displayOrder.paintings.length > 0 && (
                  <OrderPaintingsList
                    paintings={displayOrder.paintings}
                    getPaintingMentions={getPaintingMentions}
                    onMentionClick={(mention) => {
                      setMentionUserModal({
                        show: true,
                        user: mention.user || null,
                        taggedBy: mention.taggedBy || null,
                        taggedAt: mention.taggedAt || null
                      });
                    }}
                  />
                )}

                {/* Cost Breakdown */}
                <OrderCostBreakdown 
                  order={displayOrder} 
                  shouldHideMoneyFields={shouldHideMoneyFields}
                  originalOrder={order}
                  pendingMoneyDraft={pendingMoneyDraft}
                  viewingDraft={viewingDraft}
                />

                {/* Deposit Section */}
                {!shouldHideMoneyFields && displayOrder.depositAmount && (
                  <div className="mb-4">
                    <h6 className="border-bottom pb-2">
                      <i className="bi bi-cash"></i> Thông tin cọc
                    </h6>
                    <div className="mb-2">
                      <strong>Số tiền cọc:</strong>{' '}
                      {displayOrder.depositAmount?.toLocaleString('vi-VN')} VNĐ
                    </div>
                    {displayOrder.depositImages && displayOrder.depositImages.length > 0 && (
                      <div className="d-flex flex-wrap gap-2">
                        {displayOrder.depositImages.map((file, idx) => (
                          <div key={idx} className="position-relative d-inline-block">
                            {isImageFile(file) ? (
                              <img
                                src={getImageUrl(file, 'deposits')}
                                alt={`Cọc ${idx + 1}`}
                                className="img-thumbnail"
                                style={{ maxWidth: '200px', height: 'auto', cursor: 'pointer' }}
                                onClick={() => {
                                  const imgUrl = getImageUrl(file, 'deposits');
                                  if (imgUrl) window.open(imgUrl, '_blank');
                                }}
                              />
                            ) : (
                              <div 
                                className="d-flex flex-column align-items-center justify-content-center border rounded p-2"
                                style={{ width: '150px', minHeight: '120px', backgroundColor: '#f8f9fa', cursor: 'pointer' }}
                                onClick={() => {
                                  const fileUrl = getImageUrl(file, 'deposits');
                                  if (fileUrl) window.open(fileUrl, '_blank');
                                }}
                              >
                                <i className={`${getFileIcon(file)} ${getFileColor(file)}`} style={{ fontSize: '2.5rem' }}></i>
                                <small className="mt-2 text-center text-truncate" style={{ maxWidth: '140px' }} title={file}>
                                  {file}
                                </small>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Note Section */}
                {(displayOrder.note || orderNoteMentions.length > 0) && (
                  <div className="mb-4">
                    <h6 className="border-bottom pb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-sticky"></i>
                      <span>Ghi chú</span>
                    </h6>
                    {displayOrder.note ? (
                      <p
                        className="text-muted mb-2 fw-semibold"
                        style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', lineHeight: 1.6 }}
                      >
                        {displayOrder.note}
                      </p>
                    ) : (
                      <p className="text-muted fst-italic mb-2">Không có ghi chú.</p>
                    )}
                    {orderNoteMentions.length > 0 && (
                      <>
                        <div className="d-flex flex-wrap gap-2">
                          {orderNoteMentions.map((mention, index) => (
                            <span
                              key={`${mention.user?._id || mention.user || index}-${mention.taggedAt || index}`}
                              className="mention-tag-badge"
                              title={
                                mention.taggedAt
                                  ? `Nhắc bởi ${mention.taggedBy?.fullName || 'Người dùng'} vào ${new Date(mention.taggedAt).toLocaleString('vi-VN')}`
                                  : `Nhắc bởi ${mention.taggedBy?.fullName || 'Người dùng'}`
                              }
                              onClick={() => {
                                setMentionUserModal({
                                  show: true,
                                  user: mention.user || null,
                                  taggedBy: mention.taggedBy || null,
                                  taggedAt: mention.taggedAt || null
                                });
                              }}
                            >
                              <i className="bi bi-at me-1"></i>
                              {mention.user?.fullName || 'Người dùng'}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Status History Section */}
                {order.statusHistory && order.statusHistory.length > 0 && (
                  <div className="mb-4">
                    <h6 className="border-bottom pb-2">
                      <i className="bi bi-clock-history"></i> Lịch sử thay đổi trạng thái
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead>
                          <tr>
                            <th>Thời gian</th>
                            <th>Trạng thái</th>
                            <th>Người thay đổi</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.statusHistory
                            .slice()
                            .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
                            .map((history, idx) => (
                              <tr key={idx}>
                                <td>{formatDateTime(history.changedAt)}</td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(history.status)}`}>
                                    {getVnStatusName(history.status)}
                                  </span>
                                </td>
                                <td>
                                  {history.changedBy ? (
                                    history.changedBy.fullName || history.changedBy.email || '-'
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="text-muted small">
                                  {history.note || '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Created By */}
                {order.createdBy && (
                  <div>
                    <small className="text-muted">
                      <i className="bi bi-person-circle"></i> Người tạo:{' '}
                      <strong>
                        {order.createdBy.fullName || order.createdBy.email}
                      </strong>
                    </small>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-5">
                <p className="text-muted">Không tìm thấy thông tin đơn hàng</p>
              </div>
            )}
          </div>
          
          <div className="order-detail-modal-footer">
            {(() => {
              // Hiển thị chi phí cho kế toán tài chính và admin
              const showCostBreakdown = user && (Array.isArray(user.roles) && (user.roles.includes('keToanTaiChinh') || user.roles.includes('admin')));
              const costBreakdown = showCostBreakdown && displayOrder ? (() => {
                // Sử dụng displayOrder để hiển thị đúng bản đang xem
                const currentOrder = displayOrder;
                const totalAmount = Number(currentOrder.totalAmount || 0);
                const depositAmount = Number(currentOrder.depositAmount || 0);
                // Luôn tính lại COD từ totalAmount - depositAmount để đảm bảo tính đúng với bản mới
                const cod = Math.max(totalAmount - depositAmount, 0);
                // Thực nhận = COD - (vận chuyển & lắp đặt nếu khách không chịu)
                const shippingInstallationPrice = Number(currentOrder.shippingInstallationPrice || 0);
                const actualReceived = currentOrder.customerPaysShipping === false && shippingInstallationPrice > 0
                  ? Math.max(0, cod - shippingInstallationPrice)
                  : cod;
                
                // Tính toán cho bản cũ (nếu có pendingMoneyDraft và đang xem bản cũ)
                let oldTotalAmount = totalAmount;
                let oldDepositAmount = depositAmount;
                let oldCod = cod;
                let oldActualReceived = actualReceived;
                const showComparison = pendingMoneyDraft && !viewingDraft && isAdmin;
                
                if (showComparison && order) {
                  oldTotalAmount = Number(order.totalAmount || 0);
                  oldDepositAmount = Number(order.depositAmount || 0);
                  // Luôn tính lại COD từ totalAmount - depositAmount cho bản cũ
                  oldCod = Math.max(oldTotalAmount - oldDepositAmount, 0);
                  const oldShippingInstallationPrice = Number(order.shippingInstallationPrice || 0);
                  oldActualReceived = order.customerPaysShipping === false && oldShippingInstallationPrice > 0
                    ? Math.max(0, oldCod - oldShippingInstallationPrice)
                    : oldCod;
                }
                
                // Tạo danh sách các chi phí với so sánh nếu có
                const costItems = [];
                
                if (Number(currentOrder.paintingPrice || 0) > 0 || (showComparison && Number(order?.paintingPrice || 0) > 0)) {
                  const currentValue = Number(currentOrder.paintingPrice || 0);
                  const oldValue = showComparison ? Number(order?.paintingPrice || 0) : currentValue;
                  costItems.push({ 
                    label: 'Tiền tranh', 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                if (Number(currentOrder.constructionPrice || 0) > 0 || (showComparison && Number(order?.constructionPrice || 0) > 0)) {
                  const currentValue = Number(currentOrder.constructionPrice || 0);
                  const oldValue = showComparison ? Number(order?.constructionPrice || 0) : currentValue;
                  costItems.push({ 
                    label: 'Tiền thi công', 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                if (Number(currentOrder.designFee || 0) > 0 || (showComparison && Number(order?.designFee || 0) > 0)) {
                  const currentValue = Number(currentOrder.designFee || 0);
                  const oldValue = showComparison ? Number(order?.designFee || 0) : currentValue;
                  costItems.push({ 
                    label: 'Tiền thiết kế', 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                if (Number(currentOrder.extraFeeAmount || 0) > 0 || (showComparison && Number(order?.extraFeeAmount || 0) > 0)) {
                  const currentValue = Number(currentOrder.extraFeeAmount || 0);
                  const oldValue = showComparison ? Number(order?.extraFeeAmount || 0) : currentValue;
                  costItems.push({ 
                    label: `Phí phát sinh${currentOrder.extraFeeName ? ` (${currentOrder.extraFeeName})` : ''}`, 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                if (Number(currentOrder.shippingInstallationPrice || 0) > 0 || (showComparison && Number(order?.shippingInstallationPrice || 0) > 0)) {
                  const currentValue = Number(currentOrder.shippingInstallationPrice || 0);
                  const oldValue = showComparison ? Number(order?.shippingInstallationPrice || 0) : currentValue;
                  const shippingLabel = currentOrder.customerPaysShipping
                    ? 'Vận chuyển & lắp đặt (Khách chịu)'
                    : 'Vận chuyển & lắp đặt';
                  costItems.push({ 
                    label: shippingLabel, 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                // Chỉ hiển thị VAT nếu có giá trị > 0 (không hiển thị nếu chưa tính)
                if (currentOrder.includeVat !== false && Number(currentOrder.vat || 0) > 0) {
                  const currentValue = Number(currentOrder.vat || 0);
                  const oldValue = showComparison ? Number(order?.vat || 0) : currentValue;
                  costItems.push({ 
                    label: 'VAT', 
                    value: currentValue,
                    oldValue: showComparison ? oldValue : undefined
                  });
                }
                if (Number(depositAmount) > 0 || (showComparison && Number(oldDepositAmount) > 0)) {
                  costItems.push({ 
                    label: 'Tiền cọc', 
                    value: depositAmount,
                    oldValue: showComparison ? oldDepositAmount : undefined
                  });
                }
                
                // Chia làm 2 cột
                const midPoint = Math.ceil(costItems.length / 2);
                const leftColumn = costItems.slice(0, midPoint);
                const rightColumn = costItems.slice(midPoint);
                
                return (
                  <div className="order-footer-cost-breakdown-wrapper">
                    <div className="order-footer-cost-breakdown">
                      <div className="row g-3">
                        {/* Cột trái */}
                        <div className="col-md-6">
                          <div className="d-flex flex-column gap-1">
                            {leftColumn.map((item, idx) => (
                              <div key={idx} className="d-flex justify-content-between" style={{ fontSize: '0.875rem' }}>
                                <span className="text-muted">{item.label}:</span>
                                <div className="text-end">
                                  {item.oldValue !== undefined && item.oldValue !== item.value ? (
                                    <>
                                      <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                                        {orderUtils.formatCurrency(item.oldValue)}
                                      </span>
                                      <span className="text-primary fw-semibold">
                                        {orderUtils.formatCurrency(item.value)}
                                      </span>
                                    </>
                                  ) : (
                                    <strong>{item.isText ? item.value : orderUtils.formatCurrency(item.value)}</strong>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Cột phải */}
                        <div className="col-md-6">
                          <div className="d-flex flex-column gap-1">
                            {rightColumn.map((item, idx) => (
                              <div key={idx} className="d-flex justify-content-between" style={{ fontSize: '0.875rem' }}>
                                <span className="text-muted">{item.label}:</span>
                                <div className="text-end">
                                  {item.oldValue !== undefined && item.oldValue !== item.value ? (
                                    <>
                                      <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                                        {orderUtils.formatCurrency(item.oldValue)}
                                      </span>
                                      <span className="text-primary fw-semibold">
                                        {orderUtils.formatCurrency(item.value)}
                                      </span>
                                    </>
                                  ) : (
                                    <strong>{item.isText ? item.value : orderUtils.formatCurrency(item.value)}</strong>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tổng tiền, COD và Thực nhận */}
                      <div className="border-top pt-2 mt-2">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>Tổng tiền đơn hàng:</span>
                              <div className="text-end">
                                {showComparison && oldTotalAmount !== totalAmount ? (
                                  <>
                                    <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: '8px', fontSize: '0.875rem' }}>
                                      {orderUtils.formatCurrency(oldTotalAmount)}
                                    </span>
                                    <span className="text-primary">{orderUtils.formatCurrency(totalAmount)}</span>
                                  </>
                                ) : (
                                  <span className="text-primary">{orderUtils.formatCurrency(totalAmount)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>COD:</span>
                              <div className="text-end">
                                {showComparison && oldCod !== cod ? (
                                  <>
                                    <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: '8px', fontSize: '0.875rem' }}>
                                      {orderUtils.formatCurrency(oldCod)}
                                    </span>
                                    <span className="text-primary">{orderUtils.formatCurrency(cod)}</span>
                                  </>
                                ) : (
                                  <span className="text-primary">{orderUtils.formatCurrency(cod)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>Thực nhận:</span>
                              <div className="text-end">
                                {showComparison && oldActualReceived !== actualReceived ? (
                                  <>
                                    <span className="text-muted" style={{ textDecoration: 'line-through', marginRight: '8px', fontSize: '0.875rem' }}>
                                      {orderUtils.formatCurrency(oldActualReceived)}
                                    </span>
                                    <span className="text-success">{orderUtils.formatCurrency(actualReceived)}</span>
                                  </>
                                ) : (
                                  <span className="text-success">{orderUtils.formatCurrency(actualReceived)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : null;

              // Ẩn tất cả nút thay đổi trạng thái nếu đơn đã hoàn thành hoặc đã hủy
              const currentStatus = order?.status || 'moi_tao';
              if (currentStatus === 'hoan_thanh' || currentStatus === 'huy') {
                return (
                  <>
                    {costBreakdown}
                    {costBreakdown && <hr className="order-footer-divider" />}
                    <div className="order-footer-actions">
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={handleClose}
                      >
                        Đóng
                      </button>
                    </div>
                  </>
                );
              }
              
              return (
                <>
                  {costBreakdown}
                  {costBreakdown && <hr className="order-footer-divider" />}
                  <div className="order-footer-actions">
                    <OrderActions
                      order={order}
                      canAcceptOrder={canAcceptOrder}
                      canCompleteOrder={canCompleteOrder}
                      canReceiveProduction={canReceiveProduction}
                      canFrameOrder={canFrameOrder}
                      canCancelOrder={canCancelOrder}
                      canMarkReturnOrFix={canMarkReturnOrFix}
                      canMarkReceivedBack={canMarkReceivedBack}
                      canMarkPackingReceivedBack={canMarkPackingReceivedBack}
                      canSendBackToProduction={canSendBackToProduction}
                      canStoreToWarehouse={canStoreToWarehouse}
                      canProductionReceiveAgain={canProductionReceiveAgain}
                      canRequestProductionRework={canRequestProductionRework}
                      canRequestRework={canRequestRework}
                      canRequestPackingRework={canRequestPackingRework}
                      canSendBackToCustomer={canSendBackToCustomer}
                      accepting={accepting}
                      completing={completing}
                      receiving={receiving}
                      framing={framing}
                      requestingProduction={requestingProduction}
                      onAccept={handleClickAccept}
                      onComplete={handleClickComplete}
                      onReceiveProduction={handleClickReceiveProduction}
                      onFrame={handleClickFrame}
                      onCancel={handleOpenCancelModal}
                      onMarkReturn={handleMarkReturn}
                      onMarkFixRequest={handleClickMarkFixRequest}
                      onMarkReceivedBack={handleClickMarkReceivedBack}
                      onMarkPackingReceivedBack={handleClickMarkPackingReceivedBack}
                      onSendBackToProduction={handleClickSendBackToProduction}
                      onStoreToWarehouse={handleClickStoreToWarehouse}
                      onProductionReceiveAgain={handleClickProductionReceiveAgain}
                      onRequestProductionReprint={() => setShowProductionRequestReprintModal(true)}
                      onRequestProductionRecut={() => setShowProductionRequestRecutModal(true)}
                      onRequestPackingReprint={() => setShowProductionRequestReprintModal(true)}
                      onRequestReprint={handleClickRequestReprint}
                      onRequestRecut={handleClickRequestRecut}
                      onSendBackToCustomer={handleClickSendBackToCustomer}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleClose}
                    >
                      Đóng
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>

    <CancelOrderModal
      show={showCancelModal}
      reason={cancelReason}
      onReasonChange={setCancelReason}
      onClose={handleCloseCancelModal}
      onConfirm={handleCancelOrder}
      loading={cancelling}
    />
    <ShippingMethodModal
      show={showShippingModal}
      defaultMethod={(displayOrder || order)?.shippingMethod || 'viettel'}
      defaultTrackingCode={(displayOrder || order)?.shippingTrackingCode || ''}
      defaultExternalInfo={(displayOrder || order)?.shippingExternalInfo || ''}
      defaultShippingInstallationPrice={(displayOrder || order)?.shippingInstallationPrice || 0}
      defaultCustomerPaysShipping={(displayOrder || order)?.customerPaysShipping !== undefined ? (displayOrder || order)?.customerPaysShipping : false}
      totalAmount={(displayOrder || order)?.totalAmount || 0}
      depositAmount={(displayOrder || order)?.depositAmount || 0}
      onClose={() => {
        setShowShippingModal(false);
        setPendingRole(null);
      }}
      onConfirm={handleConfirmShippingMethod}
    />
    <PaymentBillModal
      show={showPaymentBillModal}
      existingImages={(displayOrder || order)?.paymentBillImages || []}
      onClose={() => {
        setShowPaymentBillModal(false);
        setPendingRole(null);
      }}
      onConfirm={handleConfirmPaymentBills}
      onError={(message) => showNotification(message, 'Lỗi')}
    />
    <ReturnReasonModal
      show={showReturnModal}
      onClose={() => setShowReturnModal(false)}
      onConfirm={handleConfirmReturnReason}
    />
    <ReasonModal
      show={showReprintReasonModal}
      onClose={() => setShowReprintReasonModal(false)}
      onConfirm={handleRequestReprint}
      title="Yêu cầu in lại"
      placeholder="Nhập lý do yêu cầu in lại..."
      loading={requestingRework}
    />
    <ReasonModal
      show={showRecutReasonModal}
      onClose={() => setShowRecutReasonModal(false)}
      onConfirm={handleRequestRecut}
      title="Yêu cầu cắt lại khung"
      placeholder="Nhập lý do yêu cầu cắt lại khung..."
      loading={requestingRework}
    />
    <ReasonModal
      show={showFixRequestReasonModal}
      onClose={() => setShowFixRequestReasonModal(false)}
      onConfirm={handleMarkFixRequest}
      title="Yêu cầu sửa tranh"
      placeholder="Nhập lý do yêu cầu sửa tranh..."
      loading={requestingRework}
    />
    <ReasonModal
      show={showSendBackReasonModal}
      onClose={() => setShowSendBackReasonModal(false)}
      onConfirm={handleSendBackToCustomer}
      title="Gửi lại cho khách"
      placeholder="Nhập lý do gửi lại cho khách..."
      loading={requestingRework}
    />
    <ReasonModal
      show={showProductionRequestReprintModal}
      onClose={() => setShowProductionRequestReprintModal(false)}
      onConfirm={(reason) => handleProductionRequest('yeu_cau_in_lai', reason)}
      title="Yêu cầu in lại"
      placeholder="Nhập lý do yêu cầu in lại..."
      loading={requestingProduction}
    />
    <ReasonModal
      show={showProductionRequestRecutModal}
      onClose={() => setShowProductionRequestRecutModal(false)}
      onConfirm={(reason) => handleProductionRequest('yeu_cau_cat_lai_khung', reason)}
      title="Yêu cầu cắt lại khung"
      placeholder="Nhập lý do yêu cầu cắt lại khung..."
      loading={requestingProduction}
    />
    <ConfirmModal
      show={confirmModal.show}
      title={confirmModal.title}
      message={confirmModal.message}
      onClose={closeConfirm}
      onConfirm={async () => {
        if (confirmModal.onConfirm) {
          await confirmModal.onConfirm();
          closeConfirm();
        }
      }}
      loading={confirmModal.loading}
    />
    <InfoModal
      show={infoModal.show}
      title={infoModal.title}
      message={infoModal.message}
      onClose={closeInfoModal}
    />

    <UserProfileModal
      show={mentionUserModal.show}
      user={mentionUserModal.user}
      taggedBy={mentionUserModal.taggedBy}
      taggedAt={mentionUserModal.taggedAt}
      onClose={() => setMentionUserModal({ show: false, user: null, taggedBy: null, taggedAt: null })}
    />
    </>
  );
}

export default OrderDetailModal;

