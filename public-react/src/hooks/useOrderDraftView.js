import { useState, useEffect, useMemo } from 'react';

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

