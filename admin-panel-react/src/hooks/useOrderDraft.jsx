import { useState } from 'react';
import api from '../utils/api';

/**
 * Custom hook để quản lý logic draft approval/rejection
 */
export function useOrderDraft(orderId, onSuccess) {
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [showRejectDraftBox, setShowRejectDraftBox] = useState(false);
  const [rejectDraftReason, setRejectDraftReason] = useState('');

  const approveDraft = async (showNotification) => {
    setDraftActionLoading(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/draft/approve`);
      if (response.data.success) {
        showNotification('Đã phê duyệt thay!');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error approving draft:', err);
      throw err;
    } finally {
      setDraftActionLoading(false);
    }
  };

  const rejectDraft = async (showNotification) => {
    if (!rejectDraftReason.trim()) {
      showNotification('Vui lòng nhập lý do từ chối', 'Cảnh báo');
      return;
    }
    setDraftActionLoading(true);
    try {
      const response = await api.patch(`/api/orders/${orderId}/draft/reject`, {
        reason: rejectDraftReason.trim()
      });
      if (response.data.success) {
        showNotification('Đã từ chối thay đổi');
        setShowRejectDraftBox(false);
        setRejectDraftReason('');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err) {
      console.error('Error rejecting draft:', err);
      throw err;
    } finally {
      setDraftActionLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 VNĐ';
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return '0 VNĐ';
    return `${numberValue.toLocaleString('vi-VN')} VNĐ`;
  };

  const renderDraftMoneyRow = (label, currentValue, draftValue, formatter = formatCurrency) => {
    if (draftValue === undefined || draftValue === null) return null;
    const currentNum = Number(currentValue ?? 0);
    const draftNum = Number(draftValue ?? 0);
    if (currentNum === draftNum) return null;
    return (
      <div className="mb-2">
        <strong>{label}:</strong> {formatter(currentNum)} {' → '}{' '}
        <span className="text-primary fw-semibold">{formatter(draftNum)}</span>
      </div>
    );
  };

  return {
    draftActionLoading,
    showRejectDraftBox,
    setShowRejectDraftBox,
    rejectDraftReason,
    setRejectDraftReason,
    approveDraft,
    rejectDraft,
    formatCurrency,
    renderDraftMoneyRow
  };
}

