import { useState, useCallback } from 'react';

/**
 * Custom hook để quản lý state của các modal chung (info, confirm)
 */
export function useModalState() {
  const [infoModal, setInfoModal] = useState({ 
    show: false, 
    title: 'Thông báo', 
    message: '' 
  });
  
  const [confirmModal, setConfirmModal] = useState({ 
    show: false, 
    title: '', 
    message: '', 
    onConfirm: null, 
    loading: false 
  });

  const showNotification = useCallback((message, title = 'Thông báo') => {
    setInfoModal({ show: true, title, message });
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModal((prev) => ({ ...prev, show: false }));
  }, []);

  const showConfirm = useCallback((options) => {
    if (typeof options === 'object' && options !== null) {
      setConfirmModal({ 
        show: true, 
        title: options.title || '', 
        message: options.message || '', 
        onConfirm: options.onConfirm || null, 
        loading: options.loading || false 
      });
    }
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: null, loading: false });
  }, []);

  return {
    infoModal,
    confirmModal,
    showNotification,
    closeInfoModal,
    showConfirm,
    closeConfirm
  };
}

