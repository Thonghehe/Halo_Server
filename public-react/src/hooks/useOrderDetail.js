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

