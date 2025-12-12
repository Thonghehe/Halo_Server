/**
 * Utility functions cho order-related operations
 */

export const getVnStatusName = (status) => {
  const names = {
    moi_tao: 'Mới tạo',
    dang_xu_ly: 'Đang xử lý',
    cho_san_xuat: 'Chờ sản xuất',
    da_vao_khung: 'Đã vào khung',
    cho_dong_goi: 'Chờ đóng gói',
    da_dong_goi: 'Đã đóng gói',
    cho_dieu_don: 'Chờ điều đơn',
    da_gui_di: 'Đã gửi đi',
    hoan_thanh: 'Hoàn thành',
    khach_tra_hang: 'Khách trả hàng',
    khach_yeu_cau_sua: 'Sửa lại',
    da_nhan_lai_don: 'Đã nhận lại đơn',
    dong_goi_da_nhan_lai: 'Đóng gói đã nhận lại',
    gui_lai_san_xuat: 'Gửi lại sản xuất',
    cho_san_xuat_lai: 'Chờ sản xuất lại',
    cat_vao_kho: 'Trong kho',
    gui_lai_cho_khach: 'Gửi lại cho khách',
    huy: 'Đã hủy'
  };
  return names[status] || status;
};

export const getStatusBadgeClass = (status) => {
  const classes = {
    // Xám (secondary): Mới tạo / Cất vào kho
    moi_tao: 'bg-secondary text-white',
    cat_vao_kho: 'bg-secondary text-white',
    
    // Vàng (warning): Chờ xử lý / Chờ làm
    cho_san_xuat: 'bg-warning text-dark',
    cho_dong_goi: 'bg-warning text-dark',
    cho_dieu_don: 'bg-warning text-dark',
    cho_san_xuat_lai: 'bg-warning text-dark',
    khach_yeu_cau_sua: 'bg-warning text-dark',
    dong_goi_da_nhan_lai: 'bg-warning text-dark',
    
    // Xanh dương (info): Đang xử lý / Đang làm
    dang_xu_ly: 'bg-info text-white',
    da_vao_khung: 'bg-info text-white',
    da_nhan_lai_don: 'bg-info text-white',
    gui_lai_san_xuat: 'bg-info text-white',
    da_gui_di: 'bg-info text-white',
    gui_lai_cho_khach: 'bg-info text-white',
    
    // Xanh lá (success): Hoàn thành / Đã xong
    da_dong_goi: 'bg-success text-white',
    hoan_thanh: 'bg-success text-white',
    
    // Đỏ (danger): Lỗi / Hủy / Yêu cầu sửa lại
    khach_tra_hang: 'bg-danger text-white',
    huy: 'bg-danger text-white'
  };
  return classes[status] || 'bg-secondary text-white';
};

export const getVnOrderTypeName = (orderType) => {
  const names = {
    thuong: 'Thường',
    gap: 'Gấp',
    shopee: 'Shopee',
    tiktok: 'TikTok'
  };
  return names[orderType] || orderType;
};

export const getOrderTypeBadgeClass = (orderType) => {
  const classes = {
    thuong: 'bg-secondary text-white',
    gap: 'bg-danger text-white',
    shopee: 'bg-warning text-dark',
    tiktok: 'bg-info text-white'
  };
  return classes[orderType] || 'bg-secondary text-white';
};

export const getVnPrintingStatusName = (status) => {
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

export const getPrintingStatusBadgeClass = (status) => {
  const classes = {
    // Xám (secondary): Chưa bắt đầu
    chua_in: 'bg-secondary text-white',
    
    // Vàng (warning): Chờ xử lý
    cho_in: 'bg-warning text-dark',
    cho_in_lai: 'bg-warning text-dark',
    
    // Xanh dương (info): Đang xử lý
    dang_in: 'bg-info text-white',
    san_xuat_da_nhan_tranh: 'bg-info text-white',
    
    // Xanh lá (success): Hoàn thành
    da_in: 'bg-success text-white',
    dong_goi_da_nhan_tranh: 'bg-success text-white',
    co_san: 'bg-success text-white',
    
    // Đỏ (danger): Yêu cầu sửa lại
    yeu_cau_in_lai: 'bg-danger text-white'
  };
  return classes[status] || 'bg-secondary text-white';
};

export const getVnFrameCuttingStatusName = (status) => {
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

export const getFrameCuttingStatusBadgeClass = (status) => {
  const classes = {
    // Xám (secondary): Chưa bắt đầu / Không áp dụng
    chua_cat: 'bg-secondary text-white',
    khong_cat_khung: 'bg-secondary text-white',
    
    // Vàng (warning): Chờ xử lý
    cho_cat_khung: 'bg-warning text-dark',
    cho_cat_lai_khung: 'bg-warning text-dark',
    
    // Xanh dương (info): Đang xử lý
    dang_cat_khung: 'bg-info text-white',
    
    // Xanh lá (success): Hoàn thành
    da_cat_khung: 'bg-success text-white',
    
    // Đỏ (danger): Yêu cầu sửa lại
    yeu_cau_cat_lai: 'bg-danger text-white'
  };
  return classes[status] || 'bg-secondary text-white';
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('vi-VN');
};

export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '-';
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
};

export const getVnPaintingTypeName = (type) => {
  const names = {
    tranh_dan: 'Tranh dán',
    tranh_dan_kinh: 'Tranh dán kính',
    tranh_khung: 'Tranh khung',
    tranh_tron: 'Tranh tròn',
    chi_in: 'Chỉ in',
    trang_guong: 'Tráng gương',
    in_noi: 'In nổi',
    son_dau: 'Sơn dầu'
  };
  return names[type] || type;
};

export const getFilename = (value) => {
  if (!value) return null;
  // Nếu đã là URL đầy đủ, extract filename
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value);
    return url.pathname.split('/').pop();
  }
  // Nếu đã có path, extract filename
  if (value.includes('/')) {
    return value.split('/').pop();
  }
  // Nếu chỉ là filename, trả về nguyên
  return value;
};

export const getImageUrl = (value, type = 'paintings') => {
  const filename = getFilename(value);
  if (!filename) return null;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  return `${baseUrl}/api/upload/${type}/${filename}`;
};

export const getProfitSharingUserName = (entry) => {
  if (!entry) return 'Người dùng';
  return entry.user?.fullName || entry.user?.email || 'Người dùng';
};

export const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
};

export const getFileIcon = (filename) => {
  if (!filename) return 'bi-file-earmark';
  const ext = filename.toLowerCase().split('.').pop();
  
  const iconMap = {
    pdf: 'bi-file-earmark-pdf',
    doc: 'bi-file-earmark-word',
    docx: 'bi-file-earmark-word',
    xls: 'bi-file-earmark-excel',
    xlsx: 'bi-file-earmark-excel',
    zip: 'bi-file-earmark-zip',
    rar: 'bi-file-earmark-zip',
    txt: 'bi-file-earmark-text',
    ai: 'bi-file-earmark-image',
    psd: 'bi-file-earmark-image',
    cdr: 'bi-file-earmark-image',
    eps: 'bi-file-earmark-image',
    svg: 'bi-file-earmark-image'
  };
  
  return iconMap[ext] || 'bi-file-earmark';
};

export const getFileColor = (filename) => {
  if (!filename) return 'text-secondary';
  const ext = filename.toLowerCase().split('.').pop();
  
  const colorMap = {
    pdf: 'text-danger',
    doc: 'text-primary',
    docx: 'text-primary',
    xls: 'text-success',
    xlsx: 'text-success',
    zip: 'text-warning',
    rar: 'text-warning',
    txt: 'text-secondary',
    ai: 'text-orange',
    psd: 'text-info',
    cdr: 'text-success',
    eps: 'text-purple',
    svg: 'text-info'
  };
  
  return colorMap[ext] || 'text-secondary';
};

export const getShippingMethodLabel = (method) => {
  const labels = {
    viettel: 'Viettel Post',
    ship_ngoai: 'Ship ngoài',
    khach_den_nhan: 'Khách đến nhận',
    di_treo_cho_khach: 'Đi treo cho khách'
  };
  if (!method) return labels.viettel;
  return labels[method] || method;
};

