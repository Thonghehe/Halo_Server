import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mosaic } from 'react-loading-indicators';
import api from '../utils/api';
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
import { useOrderDetail } from '../hooks/useOrderDetail';
import { useOrderDraftView } from '../hooks/useOrderDraftView';
import { useOrderMentions } from '../hooks/useOrderMentions';
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
  
  // Local state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReprintReasonModal, setShowReprintReasonModal] = useState(false);
  const [showRecutReasonModal, setShowRecutReasonModal] = useState(false);
  const [showFixRequestReasonModal, setShowFixRequestReasonModal] = useState(false);
  const [showSendBackReasonModal, setShowSendBackReasonModal] = useState(false);
  const [showProductionRequestReprintModal, setShowProductionRequestReprintModal] = useState(false);
  const [showProductionRequestRecutModal, setShowProductionRequestRecutModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showPaymentBillModal, setShowPaymentBillModal] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [mentionUserModal, setMentionUserModal] = useState({ show: false, user: null, taggedBy: null, taggedAt: null });
  
  const { formatCurrency, getImageUrl, formatDateTime, getVnStatusName, getStatusBadgeClass, getProfitSharingUserName, isImageFile, getFileIcon, getFileColor } = orderUtils;

  const calculateActualReceived = useCallback((inputOrder) => {
    if (!inputOrder) return 0;
    if (typeof inputOrder.actualReceivedAmount === 'number' && inputOrder.actualReceivedAmount > 0) {
      return inputOrder.actualReceivedAmount;
    }
    const totalAmount = Number(inputOrder.totalAmount || 0);
    const depositAmount = Number(inputOrder.depositAmount || 0);
    const cod = typeof inputOrder.cod === 'number'
      ? inputOrder.cod
      : Math.max(totalAmount - depositAmount, 0);
    const shippingInstallationPrice = Number(inputOrder.shippingInstallationPrice || 0);
    const customerPaysShipping = inputOrder.customerPaysShipping !== false; // mặc định true
    if (!customerPaysShipping && shippingInstallationPrice > 0) {
      return Math.max(0, cod - shippingInstallationPrice);
    }
    return cod;
  }, []);

  const handleClickAccept = (role) => {
    const roleNames = {
      'in': 'In',
      'catKhung': 'Cắt khung',
      'dongGoi': 'Đóng gói',
      'keToanDieuDon': 'Điều đơn'
    };
    showConfirm({
      title: 'Xác nhận nhận đơn',
      message: `Bạn có chắc chắn muốn nhận đơn hàng này để ${roleNames[role] || 'xử lý'}?`,
      onConfirm: async () => {
        try {
          await acceptOrder(role, showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      loading: accepting
    });
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

  const handleClickComplete = (role) => {
    if (role === 'keToanDieuDon') {
      // Kiểm tra nếu sale chưa nhập hình thức gửi đơn, hiện modal để nhập
      const currentShippingMethod = (displayOrder || order)?.shippingMethod;
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
      showConfirm({
        title: 'Xác nhận hoàn thành',
        message: 'Bạn có chắc chắn Đã in lại cho đơn hàng này?',
        onConfirm: async () => {
          try {
            await acceptOrder(role, showNotification);
          } catch (err) {
            showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
          }
        },
        loading: accepting
      });
      return;
    }
    
    if (role === 'catKhung' && frameCuttingStatus === 'cho_cat_lai_khung') {
      showConfirm({
        title: 'Xác nhận hoàn thành',
        message: 'Bạn có chắc chắn Đã cắt lại khung cho đơn hàng này?',
        onConfirm: async () => {
          try {
            await acceptOrder(role, showNotification);
          } catch (err) {
            showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
          }
        },
        loading: accepting
      });
      return;
    }
    
    // Các trường hợp khác sử dụng complete endpoint
    const roleLabels = {
      'in': 'Đã in',
      'catKhung': 'Đã cắt khung',
      'dongGoi': 'Đã đóng gói',
      'keToanTaiChinh': 'Đã thanh toán đầy đủ'
    };
    showConfirm({
      title: 'Xác nhận hoàn thành',
      message: `Bạn có chắc chắn đơn hàng này đã  "${roleLabels[role] || 'hoàn thành'}" ?`,
      onConfirm: async () => {
        try {
          const baseOrder = displayOrder || order;
          const completionPayload =
            role === 'keToanTaiChinh'
              ? { actualReceivedAmount: calculateActualReceived(baseOrder) }
              : null;
          await completeOrder(role, completionPayload, showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      loading: completing
    });
  };

  const handleConfirmShippingMethod = async (shippingInfo) => {
    setShowShippingModal(false);
    const role = pendingRole || 'keToanDieuDon';
    setPendingRole(null);
    try {
      const payload = shippingInfo && typeof shippingInfo === 'object' ? shippingInfo : {};
      await completeOrder(role, payload, showNotification);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
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

  const handleClickReceiveProduction = (type) => {
    showConfirm({
      title: 'Xác nhận nhận',
      message: `Bạn có chắc chắn đã nhận ${type === 'tranh' ? 'tranh' : 'khung'} cho đơn hàng này?`,
      onConfirm: async () => {
        try {
          await receiveOrder(type, showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
        }
      },
      loading: receiving
    });
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
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };


  const handleClickFrame = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn Đã vào khung cho đơn hàng này?',
      onConfirm: async () => {
        try {
          await frameOrder(showNotification);
        } catch (err) {
          showNotification(err.response?.data?.message || 'Đánh dấu "Đã vào khung" thất bại', 'Lỗi');
        }
      },
      loading: framing
    });
  };


  const handleMarkReceivedBack = async () => {
    if (!order || !user) return;
    try {
      await markReceivedBack(showNotification);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickMarkReceivedBack = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn Đã nhận lại đơn?',
      onConfirm: handleMarkReceivedBack,
      loading: false
    });
  };


  const handleMarkPackingReceivedBack = async () => {
    if (!order || !user) return;
    try {
      await markPackingReceivedBack(showNotification);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickMarkPackingReceivedBack = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn Đóng gói đã nhận lại?',
      onConfirm: handleMarkPackingReceivedBack,
      loading: false
    });
  };


  const handleSendBackToCustomer = async (reason) => {
    if (!order || !user) return;
    try {
      await sendBackToCustomer(reason, showNotification);
      setShowSendBackReasonModal(false);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
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
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickSendBackToProduction = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn muốn gửi lại đơn hàng cho sản xuất?',
      onConfirm: handleSendBackToProduction,
      loading: false
    });
  };

  const handleStoreToWarehouse = async () => {
    if (!order || !user) return;
    try {
      await storeToWarehouse(showNotification);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickStoreToWarehouse = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn muốn cất đơn hàng vào kho?',
      onConfirm: handleStoreToWarehouse,
      loading: false
    });
  };


  const handleProductionReceiveAgain = async () => {
    if (!order || !user) return;
    try {
      await productionReceiveAgain(showNotification);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleClickProductionReceiveAgain = () => {
    showConfirm({
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn đơn hàng này cần Chờ sản xuất lại?',
      onConfirm: handleProductionReceiveAgain,
      loading: false
    });
  };

  const handleRequestReprint = async (reason) => {
    if (!order || !user) return;
    try {
      await requestReprint(reason, showNotification);
      setShowReprintReasonModal(false);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
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
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
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
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Thao tác thất bại', 'Lỗi');
    }
  };

  const handleMarkFixRequest = async (reason) => {
    if (!order || !user) return;
    try {
      await markFixRequest(reason.trim(), showNotification);
      setShowFixRequestReasonModal(false);
      await loadOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
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
      await cancelOrder(cancelReason.trim(), showNotification);
      // Đóng modal hủy
      handleCloseCancelModal();
      // Reload order detail để cập nhật trạng thái
      await loadOrderDetail();
      // Gọi callback để reload danh sách đơn hàng ở parent
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Hủy đơn hàng thất bại', 'Lỗi');
    }
  };


  const getVnOrderTypeName = (orderType) => {
    const names = {
      thuong: 'Thường',
      gap: 'Gấp',
      shopee: 'Shopee',
      tiktok: 'TikTok'
    };
    return names[orderType] || orderType;
  };

  const getOrderTypeBadgeClass = (orderType) => {
    const classes = {
      thuong: 'bg-secondary text-white',
      gap: 'bg-danger text-white',
      shopee: 'bg-warning text-dark',
      tiktok: 'bg-info text-white'
    };
    return classes[orderType] || 'bg-secondary text-white';
  };

  const getVnPrintingStatusName = (status) => {
    const names = {
      chua_in: 'Chưa in',
      cho_in: 'Chờ in',
      dang_in: 'Đang in',
      da_in: 'Đã in',
      san_xuat_da_nhan_tranh: 'Sản xuất đã nhận tranh',
      dong_goi_da_nhan_tranh: 'Đóng gói đã nhận tranh',
      yeu_cau_in_lai: 'Yêu cầu in lại',
      cho_in_lai: 'Chờ in lại',
      co_san: 'Có sẵn'
    };
    return names[status] || status;
  };

  const getPrintingStatusBadgeClass = (status) => {
    const classes = {
      // Xám (secondary): Chưa bắt đầu
      chua_in: 'bg-secondary text-white',
      
      // Vàng (warning): Chờ xử lý
      cho_in: 'bg-warning text-dark',
      cho_in_lai: 'bg-warning text-dark',
      
      // Xanh dương (info): Đang xử lý
      dang_in: 'bg-info text-white',
      san_xuat_da_nhan_tranh: 'bg-info text-white',
      
      da_in: 'bg-info text-white',
      
      // Xanh lá (success): Hoàn thành
      dong_goi_da_nhan_tranh: 'bg-success text-white',
      co_san: 'bg-success text-white',
      
      // Đỏ (danger): Yêu cầu sửa lại
      yeu_cau_in_lai: 'bg-danger text-white'
    };
    return classes[status] || 'bg-secondary text-white';
  };

  const getVnFrameCuttingStatusName = (status) => {
    const names = {
      chua_cat: 'Chưa cắt',
      cho_cat_khung: 'Chờ cắt khung',
      dang_cat_khung: 'Đang cắt khung',
      da_cat_khung: 'Đã cắt khung',
    
      yeu_cau_cat_lai: 'Yêu cầu cắt lại',
      cho_cat_lai_khung: 'Chờ cắt lại khung',
      khong_cat_khung: 'Không cắt khung'
    };
    return names[status] || status;
  };

  const getFrameCuttingStatusBadgeClass = (status) => {
    const classes = {
      // Xám (secondary): Chưa bắt đầu / Không áp dụng
      chua_cat: 'bg-secondary text-white',
      khong_cat_khung: 'bg-secondary text-white',
      
      // Vàng (warning): Chờ xử lý
      cho_cat_khung: 'bg-warning text-dark',
      cho_cat_lai_khung: 'bg-warning text-dark',
      
      // Xanh dương (info): Đang xử lý
      dang_cat_khung: 'bg-info text-white',
      da_cat_khung: 'bg-info text-white',
      
      
      // Xanh lá (success): Hoàn thành
      
    
      
      // Đỏ (danger): Yêu cầu sửa lại
      yeu_cau_cat_lai: 'bg-danger text-white'
    };
    return classes[status] || 'bg-secondary text-white';
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
                {/* Order Header */}
                <OrderHeader order={displayOrder || order} shouldHideMoneyFields={shouldHideMoneyFields} />

                {/* Paintings List */}
                {(displayOrder || order).paintings && (displayOrder || order).paintings.length > 0 && (
                  <OrderPaintingsList
                    paintings={(displayOrder || order).paintings}
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
                <OrderCostBreakdown order={displayOrder || order} shouldHideMoneyFields={shouldHideMoneyFields} />

                {/* Deposit Section */}
                {!shouldHideMoneyFields && order.depositAmount && (
                  <div className="mb-4">
                    <h6 className="border-bottom pb-2">
                      <i className="bi bi-cash"></i> Thông tin cọc
                    </h6>
                    <div className="mb-2">
                      <strong>Số tiền cọc:</strong>{' '}
                      {order.depositAmount?.toLocaleString('vi-VN')} VNĐ
                    </div>
                    {order.depositImages && order.depositImages.length > 0 && (
                      <div className="d-flex flex-wrap gap-2">
                        {order.depositImages.map((file, idx) => (
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
                {(order.note || orderNoteMentions.length > 0) && (
                  <div className="mb-4">
                    <h6 className="border-bottom pb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-sticky"></i>
                      <span>Ghi chú</span>
                    </h6>
                    {order.note ? (
                      <p
                        className="text-muted mb-2 fw-semibold"
                        style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', lineHeight: 1.6 }}
                      >
                        {order.note}
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
              const costBreakdown = showCostBreakdown && order ? (() => {
                const totalAmount = Number(order.totalAmount || 0);
                const depositAmount = Number(order.depositAmount || 0);
                const cod = typeof order.cod === 'number' 
                  ? order.cod 
                  : Math.max(totalAmount - depositAmount, 0);
                // Thực nhận = COD - (vận chuyển & lắp đặt nếu khách không chịu)
                const shippingInstallationPrice = Number(order.shippingInstallationPrice || 0);
                const actualReceived = order.customerPaysShipping === false && shippingInstallationPrice > 0
                  ? Math.max(0, cod - shippingInstallationPrice)
                  : cod;
                
                // Tạo danh sách các chi phí
                const costItems = [];
                
                if (Number(order.paintingPrice || 0) > 0) {
                  costItems.push({ label: 'Tiền tranh', value: order.paintingPrice });
                }
                if (Number(order.constructionPrice || 0) > 0) {
                  costItems.push({ label: 'Tiền thi công', value: order.constructionPrice });
                }
                if (Number(order.designFee || 0) > 0) {
                  costItems.push({ label: 'Tiền thiết kế', value: order.designFee });
                }
                if (Number(order.extraFeeAmount || 0) > 0) {
                  costItems.push({ 
                    label: `Phí phát sinh${order.extraFeeName ? ` (${order.extraFeeName})` : ''}`, 
                    value: order.extraFeeAmount 
                  });
                }
                if (Number(order.shippingInstallationPrice || 0) > 0) {
                  const shippingLabel = order.customerPaysShipping
                    ? 'Vận chuyển & lắp đặt (Khách chịu)'
                    : 'Vận chuyển & lắp đặt';
                  costItems.push({ label: shippingLabel, value: order.shippingInstallationPrice });
                }
                // Chỉ hiển thị VAT nếu có giá trị > 0 (không hiển thị nếu chưa tính)
                if (order.includeVat !== false && Number(order.vat || 0) > 0) {
                  costItems.push({ label: 'VAT', value: order.vat });
                }
                if (Number(depositAmount) > 0) {
                  costItems.push({ label: 'Tiền cọc', value: depositAmount });
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
                                <strong>{item.isText ? item.value : orderUtils.formatCurrency(item.value)}</strong>
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
                                <strong>{item.isText ? item.value : orderUtils.formatCurrency(item.value)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tổng tiền, COD và Thực nhận */}
                      <div className="border-top pt-2 mt-2">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>Tổng tiền đơn hàng:</span>
                              <span className="text-primary">{orderUtils.formatCurrency(totalAmount)}</span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>COD:</span>
                              <span className="text-primary">{orderUtils.formatCurrency(cod)}</span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex justify-content-between" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                              <span>Thực nhận:</span>
                              <span className="text-success">{orderUtils.formatCurrency(actualReceived)}</span>
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

