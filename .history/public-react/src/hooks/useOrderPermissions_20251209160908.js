import { useMemo } from 'react';

/**
 * Custom hook để kiểm tra permissions và khả năng thực hiện các action
 */
export function useOrderPermissions(order, user) {
  // Helper: Kiểm tra đơn hàng có tranh cần vào khung và cần cắt khung hay không
  const hasFrameAssembly = useMemo(() => {
    if (!order || !order.paintings || order.paintings.length === 0) return false;
    return order.paintings.some(
      (painting) => painting.type === 'tranh_khung' || painting.type === 'tranh_tron'
    );
  }, [order]);
  const hasFrameCutting = useMemo(() => {
    if (!order || !order.paintings || order.paintings.length === 0) return false;
    return order.paintings.some((painting) => painting.type === 'tranh_khung');
  }, [order]);
  const hasTranhTron = useMemo(() => {
    if (!order || !order.paintings || order.paintings.length === 0) return false;
    return order.paintings.some((painting) => painting.type === 'tranh_tron');
  }, [order]);

  // Kiểm tra user có thể nhận đơn không
  const canAcceptOrder = useMemo(() => {
    if (!user || !order) return { canAccept: false, role: null };
    
    const userRoles = user.roles || [];
    const hasDongGoiRole = userRoles.includes('dongGoi');
    const hasKeToanDieuDonRole = userRoles.includes('keToanDieuDon');
    
    // Kiểm tra role đóng gói
    if (hasDongGoiRole) {
      const currentStatus = order.status || 'moi_tao';
      const printingStatus = order.printingStatus || 'chua_in';
      
      // Nếu không có tranh khung, đóng gói có thể nhận đơn trực tiếp từ in
      if (!hasFrameAssembly && printingStatus === 'da_in' && currentStatus === 'dang_xu_ly') {
        return { canAccept: true, role: 'dongGoi' };
      }
      
      // Nếu có tranh khung, đóng gói nhận đơn từ sản xuất (da_vao_khung)
      if (hasFrameAssembly && currentStatus === 'da_vao_khung') {
        return { canAccept: true, role: 'dongGoi' };
      }
    }
    
    // Kiểm tra role kế toán điều đơn
    if (hasKeToanDieuDonRole) {
      const currentStatus = order.status || 'moi_tao';
      if (currentStatus === 'da_dong_goi') {
        return { canAccept: true, role: 'keToanDieuDon' };
      }
    }
    
    return { canAccept: false, role: null };
  }, [user, order, hasFrameAssembly]);

  // Kiểm tra user có thể đánh dấu hoàn thành không
  const canCompleteOrder = useMemo(() => {
    if (!user || !order) return { canComplete: false, role: null, label: '' };
    
    const userRoles = user.roles || [];
    const hasInRole = userRoles.includes('in');
    const hasCatKhungRole = userRoles.includes('catKhung');
    const hasDongGoiRole = userRoles.includes('dongGoi');
    const hasKeToanDieuDonRole = userRoles.includes('keToanDieuDon');
    const hasKeToanTaiChinhRole = userRoles.includes('keToanTaiChinh');
    const hasSaleRole = userRoles.includes('sale');
    
    // Kiểm tra role in
    if (hasInRole) {
      const printingStatus = order.printingStatus || 'chua_in';
      if (printingStatus === 'chua_in' || printingStatus === 'cho_in' || printingStatus === 'dang_in' || printingStatus === 'cho_in_lai') {
        return { canComplete: true, role: 'in', label: 'Đã in' };
      }
    }
    
    // Kiểm tra role cắt khung
    if (hasCatKhungRole && hasFrameCutting) {
      const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
      if (frameCuttingStatus === 'chua_cat' || frameCuttingStatus === 'cho_cat_khung' || frameCuttingStatus === 'dang_cat_khung' || frameCuttingStatus === 'cho_cat_lai_khung') {
        return { canComplete: true, role: 'catKhung', label: 'Đã cắt khung' };
      }
    }
    
    // Kiểm tra role đóng gói
    if (hasDongGoiRole) {
      const currentStatus = order.status || 'moi_tao';
      const printingStatus = order.printingStatus || 'chua_in';
      
      // Chỉ hiển thị nút "Đã đóng gói" khi:
      // - Đơn hàng ở trạng thái "chờ đóng gói"
      // - Trạng thái in là "sản xuất đã nhận tranh" hoặc "đóng gói đã nhận tranh"
      if (
        currentStatus === 'cho_dong_goi' &&
        (printingStatus === 'san_xuat_da_nhan_tranh' || printingStatus === 'dong_goi_da_nhan_tranh')
      ) {
        return { canComplete: true, role: 'dongGoi', label: 'Đã đóng gói' };
      }
    }
    
    // Kiểm tra role kế toán điều đơn
    if (hasKeToanDieuDonRole) {
      const currentStatus = order.status || 'moi_tao';
      if (currentStatus === 'cho_dieu_don') {
        return { canComplete: true, role: 'keToanDieuDon', label: 'Đã gửi đơn' };
      }
    }
    
    // Kiểm tra role kế toán tài chính
    if (hasKeToanTaiChinhRole) {
      const currentStatus = order.status || 'moi_tao';
      if (currentStatus === 'da_gui_di') {
        return { canComplete: true, role: 'keToanTaiChinh', label: 'Đã thanh toán đầy đủ' };
      }
    }

    // Kiểm tra role sale - khách đến nhận & thanh toán tại cửa hàng
    if (hasSaleRole) {
      const printingStatus = order.printingStatus || 'chua_in';
      const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
      const shippingMethod = order.shippingMethod || '';
      const currentStatus = order.status || 'moi_tao';

      const canSaleComplete =
        printingStatus === 'co_san' &&
        frameCuttingStatus === 'co_san' &&
        shippingMethod === 'khach_den_nhan' &&
        currentStatus !== 'hoan_thanh' &&
        currentStatus !== 'huy';

      if (canSaleComplete) {
        return { canComplete: true, role: 'sale', label: 'Khách đã nhận & thanh toán' };
      }
    }
    
    return { canComplete: false, role: null, label: '' };
  }, [user, order, hasFrameCutting]);

  // Kiểm tra user có thể nhận tranh/khung không
  const canReceiveProduction = useMemo(() => {
    if (!user || !order) return { canReceive: false, type: null };
    
    const userRoles = user.roles || [];
    const isSanXuat = userRoles.includes('sanXuat');
    const isDongGoi = userRoles.includes('dongGoi');
    const currentStatus = order.status || 'moi_tao';
    const printingStatus = order.printingStatus || 'chua_in';
    
    // Đóng gói có thể nhận tranh khi đơn hàng ở trạng thái chờ đóng gói và đã in xong
    if (isDongGoi && currentStatus === 'cho_dong_goi' && printingStatus === 'da_in') {
      return { canReceive: true, type: 'tranh' };
    }
    
    // Sản xuất có thể nhận tranh khi không ở trạng thái chờ đóng gói và đã in xong
    if (isSanXuat && currentStatus !== 'cho_dong_goi' && printingStatus === 'da_in') {
      return { canReceive: true, type: 'tranh' };
    }
    
    // Sản xuất có thể nhận khung khi đã cắt khung xong
    if (isSanXuat) {
      const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
      if (frameCuttingStatus === 'da_cat_khung') {
        return { canReceive: true, type: 'khung' };
      }
    }
    
    return { canReceive: false, type: null };
  }, [user, order]);

  // Kiểm tra user có thể vào khung không
  const canFrameOrder = useMemo(() => {
    if (!user || !order) return false;
    
    const userRoles = user.roles || [];
    if (!userRoles.includes('sanXuat')) return false;
    
    const currentStatus = order.status || 'moi_tao';
    // Nếu đã vào khung rồi thì không hiển thị nút nữa
    if (currentStatus === 'da_vao_khung') return false;
    
    const printingStatus = order.printingStatus || 'chua_in';
    const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
    
    // Cho phép vào khung nếu sản xuất đã nhận tranh
    return printingStatus === 'san_xuat_da_nhan_tranh';
  }, [user, order]);

  // Kiểm tra các role bị hạn chế xem tiền
  const shouldHideMoneyFields = useMemo(() => {
    const restrictedMoneyRoles = ['in', 'catKhung', 'sanXuat', 'dongGoi'];
    return Array.isArray(user?.roles) && user.roles.some((role) => restrictedMoneyRoles.includes(role));
  }, [user]);

  // Kiểm tra user có thể hủy đơn hàng không
  const canCancelOrder = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const isAdmin = roles.includes('admin');
    const isSale = roles.includes('sale');
    if (!isAdmin && !isSale) return false;
    const currentStatus = order.status || 'moi_tao';
    return currentStatus !== 'huy' && currentStatus !== 'hoan_thanh' && currentStatus !== 'da_gui_di';
  }, [user, order]);

  // Admin/sale có thể đánh dấu trả hàng hoặc yêu cầu sửa khi trạng thái là 'da_gui_di'
  const canMarkReturnOrFix = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const isPrivileged = roles.includes('admin') || roles.includes('sale');
    const currentStatus = order.status || 'moi_tao';
    return isPrivileged && currentStatus === 'da_gui_di';
  }, [user, order]);

  // Kế toán điều đơn có thể đánh dấu "Đã nhận lại đơn" khi trạng thái là 'khach_tra_hang'
  const canMarkReceivedBack = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const hasKeToanDieuDonRole = roles.includes('keToanDieuDon');
    const currentStatus = order.status || 'moi_tao';
    return hasKeToanDieuDonRole && currentStatus === 'khach_tra_hang';
  }, [user, order]);

  // Đóng gói có thể đánh dấu "Đóng gói đã nhận lại"
  const canMarkPackingReceivedBack = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const hasDongGoiRole = roles.includes('dongGoi');
    const currentStatus = order.status || 'moi_tao';
    return hasDongGoiRole && currentStatus === 'da_nhan_lai_don';
  }, [user, order]);

  // Kiểm tra đơn hàng có phải là khách trả hàng không
  const isReturnedOrder = useMemo(() => {
    if (!order || !order.statusHistory) return false;
    return order.statusHistory.some(h => h.status === 'khach_tra_hang');
  }, [order]);

  // Kiểm tra có thể gửi lại cho khách không
  const canSendBackToCustomer = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const isAdmin = roles.includes('admin');
    const isSale = roles.includes('sale');
    if (!isAdmin && !isSale) return false;
    const currentStatus = order.status || 'moi_tao';
    return currentStatus === 'da_gui_di';
  }, [user, order]);

  // Đóng gói gửi lại sản xuất khi trạng thái là 'dong_goi_da_nhan_lai' và KHÔNG phải khách trả hàng
  const canSendBackToProduction = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const hasDongGoiRole = roles.includes('dongGoi');
    const currentStatus = order.status || 'moi_tao';
    return hasDongGoiRole && currentStatus === 'dong_goi_da_nhan_lai' && !isReturnedOrder;
  }, [user, order, isReturnedOrder]);

  // Đóng gói cất vào kho khi trạng thái là 'dong_goi_da_nhan_lai' và LÀ khách trả hàng
  const canStoreToWarehouse = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const hasDongGoiRole = roles.includes('dongGoi');
    const currentStatus = order.status || 'moi_tao';
    return hasDongGoiRole && currentStatus === 'dong_goi_da_nhan_lai' && isReturnedOrder;
  }, [user, order, isReturnedOrder]);

  // Sản xuất nhận lại để chuyển sang 'cho_san_xuat_lai'
  const canProductionReceiveAgain = useMemo(() => {
    if (!user || !order) return false;
    const roles = user.roles || [];
    const hasSanXuatRole = roles.includes('sanXuat');
    const currentStatus = order.status || 'moi_tao';
    return hasSanXuatRole && currentStatus === 'gui_lai_san_xuat';
  }, [user, order]);

  // Kiểm tra role sản xuất có thể yêu cầu in lại hoặc cắt lại khung không
  const canRequestProductionRework = useMemo(() => {
    if (!user || !order) return { canRequestReprint: false, canRequestRecut: false };
    const userRoles = user.roles || [];
    const hasSanXuatRole = userRoles.includes('sanXuat');
    if (!hasSanXuatRole) {
      return { canRequestReprint: false, canRequestRecut: false };
    }
    const currentStatus = order.status || 'moi_tao';
    // Không cho phép yêu cầu in lại/cắt lại khi đơn hàng đã chờ đóng gói
    if (currentStatus === 'cho_dong_goi') {
      return { canRequestReprint: false, canRequestRecut: false };
    }
    const printingStatus = order.printingStatus || 'chua_in';
    const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
    const canRequestReprint = printingStatus === 'da_in';
    const canRequestRecut = frameCuttingStatus === 'da_cat_khung';
    return { canRequestReprint, canRequestRecut };
  }, [user, order]);

  // Yêu cầu in lại / cắt lại khung bởi Sale
  const canRequestRework = useMemo(() => {
    if (!user || !order) return { canReprint: false, canRecut: false };
    const roles = user.roles || [];
    const hasSaleRole = roles.includes('sale') || roles.includes('admin');
    if (!hasSaleRole) {
      return { canReprint: false, canRecut: false };
    }
    const currentStatus = order.status || 'moi_tao';
    const allowedStatuses = ['da_gui_di', 'khach_yeu_cau_sua'];
    if (!allowedStatuses.includes(currentStatus)) {
      return { canReprint: false, canRecut: false };
    }
    const printingStatus = order.printingStatus || 'chua_in';
    const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
    const canReprint = printingStatus !== 'cho_in_lai';
    const canRecut = hasFrameCutting && frameCuttingStatus !== 'cho_cat_lai_khung';
    return { canReprint, canRecut };
  }, [user, order, hasFrameCutting]);

  // Yêu cầu in lại bởi Đóng gói khi đơn hàng ở trạng thái chờ đóng gói
  const canRequestPackingRework = useMemo(() => {
    if (!user || !order) return { canRequestReprint: false };
    const roles = user.roles || [];
    const hasDongGoiRole = roles.includes('dongGoi');
    if (!hasDongGoiRole) {
      return { canRequestReprint: false };
    }
    const currentStatus = order.status || 'moi_tao';
    // Chỉ cho phép yêu cầu in lại khi đơn hàng ở trạng thái chờ đóng gói
    if (currentStatus !== 'cho_dong_goi') {
      return { canRequestReprint: false };
    }
    const printingStatus = order.printingStatus || 'chua_in';
    // Chỉ cho phép yêu cầu in lại khi đã in xong và chưa ở trạng thái chờ in lại
    const canRequestReprint = printingStatus === 'da_in' || printingStatus === 'dong_goi_da_nhan_tranh';
    return { canRequestReprint };
  }, [user, order]);

  return {
    hasFrameAssembly,
    hasFrameCutting,
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
    canRequestRework
  };
}

