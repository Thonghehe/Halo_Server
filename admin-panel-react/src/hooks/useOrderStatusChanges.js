import { useState } from 'react';
import api from '../utils/api';

/**
 * Custom hook để quản lý các status change handlers phức tạp
 */
export function useOrderStatusChanges(orderId, onSuccess) {
  const [requestingRework, setRequestingRework] = useState(false);
  const [requestingProduction, setRequestingProduction] = useState(false);

  const changeOrderStatus = async (status, note, showNotification) => {
    try {
      const response = await api.patch(`/api/orders/${orderId}/status`, { 
        status,
        note
      });
      if (response.data.success) {
        if (showNotification) {
          showNotification(response.data.message || 'Thao tác thành công!');
        }
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error changing order status:', err);
      throw err;
    }
  };

  const markReceivedBack = async (showNotification) => {
    return changeOrderStatus(
      'da_nhan_lai_don',
      'Kế toán điều đơn đã nhận lại đơn',
      showNotification
    );
  };

  const markPackingReceivedBack = async (showNotification) => {
    return changeOrderStatus(
      'dong_goi_da_nhan_lai',
      'Đóng gói đã nhận lại đơn',
      showNotification
    );
  };

  const sendBackToCustomer = async (reason, showNotification) => {
    setRequestingRework(true);
    try {
      await changeOrderStatus(
        'gui_lai_cho_khach',
        `Gửi lại cho khách: ${reason.trim()}`,
        showNotification
      );
    } finally {
      setRequestingRework(false);
    }
  };

  const sendBackToProduction = async (showNotification) => {
    return changeOrderStatus(
      'gui_lai_san_xuat',
      'Đóng gói gửi lại sản xuất',
      showNotification
    );
  };

  const storeToWarehouse = async (showNotification) => {
    return changeOrderStatus(
      'cat_vao_kho',
      'Đóng gói đã cất vào kho',
      showNotification
    );
  };

  const productionReceiveAgain = async (showNotification) => {
    return changeOrderStatus(
      'cho_san_xuat_lai',
      'Sản xuất đã nhận lại, chuyển chờ sản xuất lại',
      showNotification
    );
  };

  const requestReprint = async (reason, showNotification) => {
    setRequestingRework(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/rework`, { 
        type: 'yeu_cau_in_lai',
        reason: reason.trim()
      });
      if (response.data.success) {
        if (showNotification) {
          showNotification('Đã yêu cầu in lại tranh');
        }
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error requesting reprint:', err);
      throw err;
    } finally {
      setRequestingRework(false);
    }
  };

  const requestRecut = async (reason, showNotification) => {
    setRequestingRework(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/rework`, { 
        type: 'yeu_cau_cat_lai',
        reason: reason.trim()
      });
      if (response.data.success) {
        if (showNotification) {
          showNotification('Đã chuyển đơn sang "Sửa lại" và trạng thái khung sang "Chờ cắt lại"');
        }
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error requesting recut:', err);
      throw err;
    } finally {
      setRequestingRework(false);
    }
  };

  const markReturn = async (reason, showNotification) => {
    return changeOrderStatus(
      'khach_tra_hang',
      `Khách hoàn hàng: ${String(reason).trim()}`,
      showNotification
    );
  };

  const productionRequest = async (type, reason, showNotification) => {
    setRequestingProduction(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/production-request`, { 
        type,
        reason: reason.trim()
      });
      if (response.data.success) {
        if (showNotification) {
          showNotification(response.data.message || 'Yêu cầu thành công!');
        }
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error requesting production rework:', err);
      throw err;
    } finally {
      setRequestingProduction(false);
    }
  };

  return {
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
  };
}

