import { useState } from 'react';
import api from '../utils/api';

/**
 * Custom hook để quản lý các action thay đổi status của order
 */
export function useOrderStatusActions(orderId, onSuccess) {
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [framing, setFraming] = useState(false);
  const [requestingRework, setRequestingRework] = useState(false);
  const [requestingProduction, setRequestingProduction] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const acceptOrder = async (role, showNotification) => {
    setAccepting(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/accept`, { role });
      if (response.data.success) {
        showNotification('Nhận đơn hàng thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error accepting order:', err);
      throw err;
    } finally {
      setAccepting(false);
    }
  };

  const completeOrder = async (role, completionData, showNotification) => {
    setCompleting(true);
    try {
      const payload = {
        role,
        ...(completionData && typeof completionData === 'object' ? completionData : {})
      };
      const response = await api.patch(`/api/orders/${orderId}/complete`, payload);
      if (response.data.success) {
        showNotification('Đánh dấu hoàn thành thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error completing order:', err);
      throw err;
    } finally {
      setCompleting(false);
    }
  };

  const receiveOrder = async (type, showNotification) => {
    setReceiving(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/receive`, { type });
      if (response.data.success) {
        showNotification('Nhận thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error receiving order:', err);
      throw err;
    } finally {
      setReceiving(false);
    }
  };

  const frameOrder = async (showNotification) => {
    setFraming(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/status`, { 
        status: 'da_vao_khung'
      });
      if (response.data.success) {
        showNotification('Đã vào khung thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error framing order:', err);
      throw err;
    } finally {
      setFraming(false);
    }
  };

  const requestRework = async (type, reason, showNotification) => {
    setRequestingRework(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/rework`, { 
        type,
        reason: reason.trim()
      });
      if (response.data.success) {
        showNotification('Yêu cầu sản xuất lại thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error requesting rework:', err);
      throw err;
    } finally {
      setRequestingRework(false);
    }
  };

  const requestProductionRework = async (type, reason, showNotification) => {
    setRequestingProduction(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/production-request`, { 
        type,
        reason: reason.trim()
      });
      if (response.data.success) {
        showNotification('Yêu cầu sản xuất lại thành công!');
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

  const cancelOrder = async (reason, showNotification) => {
    setCancelling(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/status`, { 
        status: 'huy',
        note: `Hủy đơn hàng: ${reason.trim()}`
      });
      if (response.data.success) {
        showNotification('Hủy đơn hàng thành công!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      throw err;
    } finally {
      setCancelling(false);
    }
  };

  const markFixRequest = async (reason, showNotification) => {
    setRequestingRework(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/status`, { 
        status: 'khach_yeu_cau_sua',
        note: `Khách yêu cầu sửa tranh: ${reason.trim()}`
      });
      if (response.data.success) {
        showNotification('Đã chuyển trạng thái sang "Sửa lại"');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error marking fix request:', err);
      throw err;
    } finally {
      setRequestingRework(false);
    }
  };

  return {
    accepting,
    completing,
    receiving,
    framing,
    requestingRework,
    requestingProduction,
    cancelling,
    acceptOrder,
    completeOrder,
    receiveOrder,
    frameOrder,
    requestRework,
    requestProductionRework,
    cancelOrder,
    markFixRequest
  };
}

