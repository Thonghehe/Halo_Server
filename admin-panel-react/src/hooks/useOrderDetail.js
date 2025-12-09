import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Custom hook để quản lý việc load và state của order detail
 */
export function useOrderDetail(orderId, show, onOrderUpdated) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOrderDetail = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!orderId) return;
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.data);
      }
    } catch (err) {
      console.error('Error loading order detail:', err);
      throw err;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [orderId]);

  // Load order khi modal mở
  useEffect(() => {
    if (show && orderId) {
      loadOrderDetail();
    } else {
      setOrder(null);
    }
  }, [show, orderId, loadOrderDetail]);

  // SSE stream để cập nhật real-time
  useEffect(() => {
    if (!show || !orderId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/api/orders/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.orderId === orderId) {
          loadOrderDetail({ silent: true });
        }
      } catch (error) {
        console.error('Error parsing order stream:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Order detail stream error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [show, orderId, loadOrderDetail]);

  const refreshOrder = useCallback(async () => {
    return await loadOrderDetail();
  }, [loadOrderDetail]);

  return {
    order,
    loading,
    loadOrderDetail,
    refreshOrder
  };
}

/**
 * Custom hook để quản lý draft view (switch giữa bản cũ và bản sửa)
 */
export function useOrderDraftView(order, user) {
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin');
  const pendingMoneyDraft =
    isAdmin && order?.pendingMoneyDraft?.status === 'pending' ? order.pendingMoneyDraft : null;
  
  const [viewingDraft, setViewingDraft] = useState(false);
  
  // Computed: merge order với draft.data khi đang xem bản sửa
  const displayOrder = useMemo(() => {
    if (!order) return null;
    if (!viewingDraft || !pendingMoneyDraft || !pendingMoneyDraft.data) {
      return order;
    }
    // Merge order với draft.data, ưu tiên draft.data
    return {
      ...order,
      ...pendingMoneyDraft.data,
      // Giữ lại các trường không nên bị override từ draft
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      printingStatus: order.printingStatus,
      frameCuttingStatus: order.frameCuttingStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory,
      // Nếu draft.data có paintings, sử dụng nó, nếu không giữ nguyên
      paintings: pendingMoneyDraft.data.paintings || order.paintings
    };
  }, [order, viewingDraft, pendingMoneyDraft]);
  
  // Reset viewingDraft khi order thay đổi hoặc không còn draft
  useEffect(() => {
    if (!pendingMoneyDraft) {
      setViewingDraft(false);
    }
  }, [pendingMoneyDraft]);

  return {
    isAdmin,
    pendingMoneyDraft,
    viewingDraft,
    setViewingDraft,
    displayOrder
  };
}

