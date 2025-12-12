import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mosaic } from 'react-loading-indicators';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useOrders, useAllOrders, useSales } from '../hooks/useOrders';
import OrderDetailModal from '../components/OrderDetailModal';
import '../styles/Orders.css';
import { useAuth } from '../contexts/AuthContext';

const buildQueryString = (q = {}) => {
  const params = new URLSearchParams();
  if (q.status) params.append('status', q.status);
  if (q.orderType) params.append('orderType', q.orderType);
  if (q.search) params.append('search', q.search);
  if (q.printingStatus) params.append('printingStatus', q.printingStatus);
  if (q.frameCuttingStatus) params.append('frameCuttingStatus', q.frameCuttingStatus);
  if (q.startDate) params.append('startDate', q.startDate);
  if (q.endDate) params.append('endDate', q.endDate);
  if (q.createdBy) params.append('createdBy', q.createdBy);
  if (q.page) params.append('page', q.page);
  if (q.limit) params.append('limit', q.limit);
  if (q.sortOrder) params.append('sortOrder', q.sortOrder);
  return params.toString();
};

function Orders() {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 1 });
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    orderType: '',
    search: ''
  });
  const [pendingQuery, setPendingQuery] = useState({
    status: '',
    orderType: '',
    search: '',
    printingStatus: '',
    frameCuttingStatus: '',
    startDate: '',
    endDate: '',
    createdBy: ''
  });
  const [sortOrder, setSortOrder] = useState(''); // 'asc' | 'desc' | ''
  const [frameSizeSort, setFrameSizeSort] = useState(''); // 'smallToLarge' | 'largeToSmall' | ''
  const [confirmingId, setConfirmingId] = useState(null);
  const { user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const pendingQueryRef = useRef(pendingQuery);
  const refreshTimeoutRef = useRef(null);
  const sortOrderRef = useRef(sortOrder);
  const frameSizeSortRef = useRef(frameSizeSort);

  // Sử dụng React Query hooks
  const { data: allOrders = [], isLoading: allOrdersLoading } = useAllOrders();
  const { data: sales = [] } = useSales();

  const getUserId = (userObj) => userObj?._id || userObj?.id;

  const getOrderCreatorId = (orderObj) => {
    if (!orderObj) return null;
    const createdBy = orderObj.createdBy;
    if (!createdBy) return null;
    if (typeof createdBy === 'string') return createdBy;
    return createdBy._id || createdBy.id;
  };

  // Load orders với filters từ pendingQuery
  const queryFilters = useMemo(() => {
    const q = { ...pendingQuery };
    q.page = page;
    q.limit = limit;
    // Để sortOrder luôn thay đổi queryKey (kể cả khi bỏ chọn), dùng 'none' làm giá trị mặc định
    q.sortOrder = sortOrder || 'none';
    Object.keys(q).forEach((key) => {
      // Giữ sortOrder='none' để phân biệt trạng thái; các key khác vẫn loại bỏ rỗng
      if (key !== 'sortOrder' && (q[key] === '' || q[key] === null || q[key] === undefined)) {
        delete q[key];
      }
    });
    return q;
  }, [pendingQuery, page, limit, sortOrder]);

  const { data: ordersResp = {}, isLoading: ordersLoading } = useOrders(queryFilters);

  // Tính tổng diện tích khung cho một đơn hàng (cm²)
  const calculateTotalFrameArea = useCallback((order) => {
    if (!order || !Array.isArray(order.paintings)) return 0;
    return order.paintings.reduce((total, painting) => {
      const width = Number(painting?.width) || 0;
      const height = Number(painting?.height) || 0;
      const quantity = Number(painting?.quantity) || 1;
      return total + (width * height * quantity);
    }, 0);
  }, []);

  const sortOrdersData = useCallback((data, direction, frameSizeDirection) => {
    const sorted = [...data];
    
    // Nếu có sắp xếp theo kích thước khung
    if (frameSizeDirection) {
      sorted.sort((a, b) => {
        // Ưu tiên đơn gấp lên trước
        const aIsUrgent = a.orderType === 'gap';
        const bIsUrgent = b.orderType === 'gap';
        
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
        
        // Nếu cùng loại (cả hai đều gấp hoặc cả hai đều không gấp), sắp xếp theo kích thước
        const aArea = calculateTotalFrameArea(a);
        const bArea = calculateTotalFrameArea(b);
        
        if (frameSizeDirection === 'smallToLarge') {
          return aArea - bArea;
        } else if (frameSizeDirection === 'largeToSmall') {
          return bArea - aArea;
        }
        
        return 0;
      });
    } else if (direction) {
      // Sắp xếp theo ngày tạo
      if (direction === 'asc') {
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (direction === 'desc') {
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    }
    
    return sorted;
  }, [calculateTotalFrameArea]);

  // Sort orders khi data thay đổi
  useEffect(() => {
    const ordersData = ordersResp?.data || [];
    const pg = ordersResp?.pagination;
    if (ordersData && ordersData.length > 0) {
      const sortedOrders = sortOrdersData(ordersData, sortOrderRef.current, frameSizeSortRef.current);
      setOrders(sortedOrders);
      if (pg) {
        setPagination({
          page: pg.page || page,
          limit: pg.limit || limit,
          total: pg.total || ordersData.length,
          pages: pg.pages || 1
        });
        setPage(pg.page || page);
        setLimit(pg.limit || limit);
      }
      setTableLoading(false);
      setPageLoading(false);
    } else if (!ordersLoading) {
      setOrders([]);
      if (pg) {
        setPagination({
          page: pg.page || page,
          limit: pg.limit || limit,
          total: pg.total || 0,
          pages: pg.pages || 1
        });
        setPage(pg.page || page);
        setLimit(pg.limit || limit);
      }
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [ordersResp, ordersLoading, sortOrdersData, page, limit]);

  // Load filters from URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlFilters = {
      status: urlParams.get('status') || '',
      orderType: urlParams.get('orderType') || '',
      search: urlParams.get('search') || '',
      printingStatus: urlParams.get('printingStatus') || '',
      frameCuttingStatus: urlParams.get('frameCuttingStatus') || '',
      startDate: urlParams.get('startDate') || '',
      endDate: urlParams.get('endDate') || '',
      createdBy: urlParams.get('createdBy') || ''
    };
    const urlPage = urlParams.get('page') ? parseInt(urlParams.get('page'), 10) : 1;
    const urlLimit = urlParams.get('limit') ? parseInt(urlParams.get('limit'), 10) : 100;
    const urlSortOrder = urlParams.get('sortOrder') || '';

    if (Object.values(urlFilters).some(v => v !== '') || urlPage !== 1 || urlLimit !== 100 || urlSortOrder !== '') {
      setPendingQuery(urlFilters);
      setFilters({
        status: urlFilters.status,
        orderType: urlFilters.orderType,
        search: urlFilters.search
      });
      setPage(urlPage);
      setLimit(urlLimit);
      if (urlSortOrder) {
        setSortOrder(urlSortOrder);
      }
    }
  }, []);

  useEffect(() => {
    pendingQueryRef.current = pendingQuery;
  }, [pendingQuery]);

  useEffect(() => {
    const updateIsMobile = () => {
      const mobile = window.innerWidth <= 991;
      setIsMobile(mobile);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    sortOrderRef.current = sortOrder;
  }, [sortOrder]);

  useEffect(() => {
    frameSizeSortRef.current = frameSizeSort;
  }, [frameSizeSort]);

  useEffect(() => {
    if (frameSizeSort) {
      // Sắp xếp theo kích thước khung trên dữ liệu hiện có
      setOrders((prev) => sortOrdersData(prev, sortOrder, frameSizeSort));
    } else {
      // Sort theo ngày tạo: refetch backend để phân trang đúng toàn bộ
      setTableLoading(true);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder, frameSizeSort]);


  const triggerRealtimeRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = setTimeout(() => {
      // Invalidate queries để refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refreshTimeoutRef.current = null;
    }, 300);
  }, [queryClient]);

  // Auto-load table when search text changes (debounced) - affects only table
  useEffect(() => {
    const handler = setTimeout(() => {
      if (pendingQuery.search.length === 0 || pendingQuery.search.length >= 2) {
        setPage(1);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery.search, queryClient]);

  // Auto-load table immediately when filters change
  useEffect(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery.status, pendingQuery.orderType, pendingQuery.printingStatus, pendingQuery.frameCuttingStatus, pendingQuery.startDate, pendingQuery.endDate, pendingQuery.createdBy, queryClient]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/api/orders/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.orderId) return;
        triggerRealtimeRefresh();
      } catch (error) {
        console.error('Error parsing order stream:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Order stream error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, API_BASE_URL, triggerRealtimeRefresh]);

  const applySearch = () => {
    setFilters(pendingQuery);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleQuickSort = (order) => {
    // Nếu click vào nút đã active thì reset về mặc định
    if (sortOrder === order) {
      setSortOrder('');
    } else {
      setSortOrder(order);
      setFrameSizeSort(''); // Reset frame size sort when using date sort
    }
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    setTableLoading(true);
    setPage(nextPage);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value) || 100;
    setTableLoading(true);
    setLimit(newLimit);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleFrameSizeSort = (direction) => {
    // Nếu click vào nút đã active thì reset về mặc định
    if (frameSizeSort === direction) {
      setFrameSizeSort('');
    } else {
      setFrameSizeSort(direction);
      setSortOrder(''); // Reset date sort when using frame size sort
    }
  };

  const onKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      applySearch();
    }
  };

  const getVnStatusName = (status) => {
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
      huy: 'Đã hủy'
    };
    return names[status] || status;
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
      khong_cat_khung: 'Không cắt khung',
      yeu_cau_cat_lai: 'Yêu cầu cắt lại',
      cho_cat_lai_khung: 'Chờ cắt lại khung'
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
      
      da_cat_khung: 'bg-success text-white',
      
      // Xanh lá (success): Hoàn thành
      
      // Đỏ (danger): Yêu cầu sửa lại
      yeu_cau_cat_lai: 'bg-danger text-white'
    };
    return classes[status] || 'bg-secondary text-white';
  };

  const getStatusBadgeClass = (status) => {
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
      da_dong_goi: 'bg-info text-white',
      
      // Xanh lá (success): Hoàn thành / Đã xong
      
      hoan_thanh: 'bg-success text-white',
      
      // Đỏ (danger): Lỗi / Hủy / Yêu cầu sửa lại
      khach_tra_hang: 'bg-danger text-white',
      huy: 'bg-danger text-white'
    };
    return classes[status] || 'bg-secondary text-white';
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

  const getPaintingCount = (order) => {
    if (!order || !Array.isArray(order.paintings)) return 0;
    return order.paintings.reduce((total, painting) => {
      const quantity = Number(painting?.quantity) || 0;
      return total + (quantity > 0 ? quantity : 1);
    }, 0);
  };

  const calculateActualReceived = useCallback((order) => {
    if (!order) return 0;
    if (typeof order.actualReceivedAmount === 'number' && order.actualReceivedAmount > 0) {
      return order.actualReceivedAmount;
    }
    const totalAmount = Number(order.totalAmount || 0);
    const depositAmount = Number(order.depositAmount || 0);
    const cod = typeof order.cod === 'number'
      ? order.cod
      : Math.max(totalAmount - depositAmount, 0);
    const shippingInstallationPrice = Number(order.shippingInstallationPrice || 0);
    const customerPaysShipping = order.customerPaysShipping !== false; // mặc định true
    if (!customerPaysShipping && shippingInstallationPrice > 0) {
      return Math.max(0, cod - shippingInstallationPrice);
    }
    return cod;
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    try {
      return Number(value).toLocaleString('vi-VN') + 'đ';
    } catch {
      return value;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Calculate stats
  const userRoles = user?.roles || [];
  const isCatKhung = userRoles.includes('catKhung');
  const isFinance = userRoles.includes('keToanTaiChinh');
  const isAccountingOps = userRoles.includes('keToanDieuDon');
  const canViewActualReceived = isFinance || isAccountingOps;
  // Hiển thị cột người tạo cho sale, kế toán điều đơn và kế toán tài chính
  const showCreatorColumn = userRoles.includes('sale') || isAccountingOps || isFinance;
  const hideCustomerColumn =
    userRoles.includes('in') ||
    userRoles.includes('sanXuat') ||
    userRoles.includes('catKhung');
  const hidePrintingStatusColumn =
    userRoles.includes('catKhung') ||
    userRoles.includes('dongGoi') ||
    userRoles.includes('keToanDieuDon') ||
    isFinance;
  // Ẩn cột trạng thái khung vì hiện không sử dụng
  // const hideFrameStatusColumn =
  //   userRoles.includes('in') ||
  //   userRoles.includes('dongGoi') ||
  //   userRoles.includes('keToanDieuDon') ||
  //   isFinance;
  const hideFrameStatusColumn = true;

  const stats = {
    total: allOrders.length,
    processing: allOrders.filter(o => 
      ['dang_xu_ly', 'cho_san_xuat', 'da_vao_khung', 'cho_dong_goi', 'cho_dieu_don'].includes(o.status)
    ).length,
    completed: allOrders.filter(o => o.status === 'hoan_thanh').length,
    cancelled: allOrders.filter(o => o.status === 'huy').length
  };

  const handleViewDetail = (orderId) => {
    setSelectedOrderId(orderId);
    setShowModal(true);
  };

  const handleFinanceConfirm = async (order) => {
    if (!order) return;
    const calculatedActualReceived = calculateActualReceived(order);
    const orderId = order._id || order.id;
    const confirmMessage = 'Bạn có chắc chắn đơn hàng này đã  "Đã thanh toán đầy đủ" ?';
    const ok = window.confirm(confirmMessage);
    if (!ok) return;

    setConfirmingId(orderId);
    try {
      const res = await api.patch(`/api/orders/${orderId}/complete`, {
        role: 'keToanTaiChinh',
        actualReceivedAmount: calculatedActualReceived
      });
      if (res.data?.success) {
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'orders'
        });
      }
    } catch (err) {
      console.error('Finance confirm error', err);
      const message = err?.response?.data?.message || 'Thao tác thất bại';
      alert(message);
    } finally {
      setConfirmingId(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrderId(null);
  };

  if (pageLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 orders-header-responsive">
        <h2>Quản lý Đơn hàng</h2>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-11">
              <label className="form-label">Tìm kiếm</label>
              <input
                type="text"
                className="form-control"
                placeholder="Mã đơn, SĐT, Địa chỉ..."
                value={pendingQuery.search}
                onChange={(e) => setPendingQuery({ ...pendingQuery, search: e.target.value })}
                onKeyDown={onKeyDownSearch}
              />
            </div>
            <div className="col-12 col-md-1 d-flex align-items-end">
              <button
                type="button"
                className={`btn w-100 ${showFilters ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              >
                <i className="bi bi-funnel"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label">Trạng thái</label>
              <select
                className="form-select"
                value={pendingQuery.status}
                onChange={(e) => setPendingQuery({ ...pendingQuery, status: e.target.value })}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="chua_hoan_thanh">Chưa hoàn thành</option>
                <option value="moi_tao">Mới tạo</option>
                <option value="dang_xu_ly">Đang xử lý (Tất cả)</option>
                <option value="cho_san_xuat">Chờ sản xuất</option>
                <option value="da_vao_khung">Đã vào khung</option>
                <option value="cho_dong_goi">Chờ đóng gói</option>
                <option value="da_dong_goi">Đã đóng gói</option>
                <option value="cho_dieu_don">Chờ điều đơn</option>
                <option value="da_gui_di">Đã gửi đi</option>
                <option value="hoan_thanh">Hoàn thành</option>
                <option value="khach_tra_hang">Khách trả hàng</option>
                <option value="khach_yeu_cau_sua">Sửa lại</option>
                <option value="da_nhan_lai_don">Đã nhận lại đơn</option>
                <option value="dong_goi_da_nhan_lai">Đóng gói đã nhận lại</option>
                <option value="gui_lai_san_xuat">Gửi lại sản xuất</option>
                <option value="cho_san_xuat_lai">Chờ sản xuất lại</option>
                <option value="huy">Đã hủy</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Loại đơn</label>
              <select
                className="form-select"
                value={pendingQuery.orderType}
                onChange={(e) => setPendingQuery({ ...pendingQuery, orderType: e.target.value })}
              >
                <option value="">Tất cả loại</option>
                <option value="thuong">Thường</option>
                <option value="gap">Gấp</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Trạng thái In</label>
              <select
                className="form-select"
                value={pendingQuery.printingStatus}
                onChange={(e) => setPendingQuery({ ...pendingQuery, printingStatus: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="chua_in,cho_in_lai">Chưa in / Chờ in lại</option>
                <option value="cho_in">Chờ in</option>
                <option value="dang_in">Đang in</option>
                <option value="da_in">Đã in</option>
                <option value="san_xuat_da_nhan_tranh">Sản xuất đã nhận tranh</option>
                <option value="yeu_cau_in_lai">Yêu cầu in lại</option>
              </select>
            </div>
            {/* Ẩn bộ lọc trạng thái khung vì hiện không sử dụng */}
            {/*
            <div className="col-12 col-md-2">
              <label className="form-label">Trạng thái khung</label>
              <select
                className="form-select"
                value={pendingQuery.frameCuttingStatus}
                onChange={(e) => setPendingQuery({ ...pendingQuery, frameCuttingStatus: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="chua_cat,cho_cat_lai_khung">Chưa cắt / Chờ cắt lại</option>
                <option value="cho_cat_khung">Chờ cắt khung</option>
                <option value="dang_cat_khung">Đang cắt khung</option>
                <option value="da_cat_khung">Đã cắt khung</option>
                <option value="yeu_cau_cat_lai">Yêu cầu cắt lại</option>
                <option value="khong_cat_khung">Không cắt khung</option>
              </select>
            </div>
            */}
          </div>
          <div className="row g-3 mt-2">
            {!isCatKhung && (
              <>
                <div className="col-12 col-md-3">
                  <label className="form-label">Từ ngày</label>
                  <input
                    type="date"
                    className="form-control"
                    value={pendingQuery.startDate}
                    onChange={(e) => setPendingQuery({ ...pendingQuery, startDate: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Đến ngày</label>
                  <input
                    type="date"
                    className="form-control"
                    value={pendingQuery.endDate}
                    onChange={(e) => setPendingQuery({ ...pendingQuery, endDate: e.target.value })}
                  />
                </div>
              </>
            )}
            {isCatKhung && (
              <div className="col-12 col-md-6">
                <label className="form-label">Sắp xếp theo kích thước khung</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${frameSizeSort === 'smallToLarge' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => handleFrameSizeSort('smallToLarge')}
                    title="Khung nhỏ đến to (click lại để về mặc định)"
                  >
                    <i className="bi bi-sort-up"></i> Nhỏ → To
                  </button>
                  <button
                    type="button"
                    className={`btn ${frameSizeSort === 'largeToSmall' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => handleFrameSizeSort('largeToSmall')}
                    title="Khung to đến nhỏ (click lại để về mặc định)"
                  >
                    <i className="bi bi-sort-down"></i> To → Nhỏ
                  </button>
                </div>
              </div>
            )}
            <div className="col-12 col-md-3">
              <label className="form-label">Sale</label>
              <select
                className="form-select"
                value={pendingQuery.createdBy}
                onChange={(e) => setPendingQuery({ ...pendingQuery, createdBy: e.target.value })}
              >
                <option value="">Tất cả sale</option>
                {sales.map((sale) => (
                  <option key={sale._id} value={sale._id}>
                    {sale.fullName || sale.email}
                  </option>
                ))}
              </select>
            </div>
            {!isCatKhung && (
              <div className="col-12 col-md-3">
                <label className="form-label">Sắp xếp</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${sortOrder === 'desc' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => handleQuickSort('desc')}
                    title="Từ mới đến cũ (click lại để về mặc định)"
                  >
                    <i className="bi bi-sort-down"></i> Mới → Cũ
                  </button>
                  <button
                    type="button"
                    className={`btn ${sortOrder === 'asc' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => handleQuickSort('asc')}
                    title="Từ cũ đến mới (click lại để về mặc định)"
                  >
                    <i className="bi bi-sort-up"></i> Cũ → Mới
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Table - Desktop View */}
      <div className="card order-table-desktop">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  {!hideCustomerColumn && <th>Khách hàng</th>}
                  <th>SĐT/Zalo</th>
                  <th>Trạng thái</th>
                  {!hidePrintingStatusColumn && <th>In</th>}
                  {!hideFrameStatusColumn && <th>Khung</th>}
                  <th>Loại</th>
                  <th>Ngày tạo</th>
                  {showCreatorColumn && <th>Người tạo</th>}
                  {canViewActualReceived && <th>Tiền thực nhận</th>}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                   const baseColumns = 9; // mã, khách, sđt, trạng thái, in, khung, loại, ngày, thao tác
                  const visibleColumnCount =
                    baseColumns -
                    (hideCustomerColumn ? 1 : 0) -
                    (hidePrintingStatusColumn ? 1 : 0) -
                    (hideFrameStatusColumn ? 1 : 0) +
                    (showCreatorColumn ? 1 : 0) +
                     (canViewActualReceived ? 1 : 0);
                  if (tableLoading) {
                    return (
                      <tr>
                        <td colSpan={visibleColumnCount} className="text-center py-4">
                          <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
                        </td>
                      </tr>
                    );
                  }
                  if (orders.length === 0) {
                    return (
                      <tr>
                        <td colSpan={visibleColumnCount} className="text-center text-muted">
                          Không có đơn hàng nào
                        </td>
                      </tr>
                    );
                  }
                  return orders.map((order) => (
                    <tr
                      key={order._id || order.id}
                      onClick={() => setShowModal(true) || setSelectedOrderId(order._id || order.id)}
                      style={{ cursor: 'pointer' }}
                      className="order-row"
                    >
                      <td>
                        <strong>{order.orderCode}</strong>
                        <span className="text-muted ms-1">({getPaintingCount(order)})</span>
                      </td>
                      {!hideCustomerColumn && <td>{order.customerName || '-'}</td>}
                      <td>{order.customerPhone}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {getVnStatusName(order.status)}
                        </span>
                      </td>
                      {!hidePrintingStatusColumn && (
                        <td>
                          <span className={`badge ${getPrintingStatusBadgeClass(order.printingStatus || 'chua_in')}`}>
                            {getVnPrintingStatusName(order.printingStatus || 'chua_in')}
                          </span>
                        </td>
                      )}
                      {!hideFrameStatusColumn && (
                        <td>
                          <span className={`badge ${getFrameCuttingStatusBadgeClass(order.frameCuttingStatus || 'chua_cat')}`}>
                            {getVnFrameCuttingStatusName(order.frameCuttingStatus || 'chua_cat')}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className={`badge ${getOrderTypeBadgeClass(order.orderType)}`}>
                          {getVnOrderTypeName(order.orderType)}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      {showCreatorColumn && (
                        <td>
                          {order.createdBy?.fullName || order.createdBy?.email || '-'}
                        </td>
                      )}
                      {canViewActualReceived && (
                        <td>{formatCurrency(calculateActualReceived(order))}</td>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const canEdit = userRoles.includes('admin') || userRoles.includes('sale');
                          const blocked = ['huy', 'da_gui_di', 'hoan_thanh', 'cat_vao_kho'].includes(order.status);
                          const canFinanceConfirm = isFinance && order.status === 'da_gui_di';
                          const showPendingDraftIndicator = order.hasPendingMoneyDraft;
                          if (canEdit && !blocked) {
                            return (
                              <div className="d-inline-flex align-items-center gap-1">
                                <Link
                                  to={`/orders/${order._id || order.id}/edit`}
                                  className="btn btn-sm btn-primary"
                                >
                                  <i className="bi bi-pencil"></i> Sửa
                                </Link>
                                {showPendingDraftIndicator && (
                                  <i
                                    className="bi bi-exclamation-circle-fill text-danger"
                                    style={{ fontSize: '1.1rem' }}
                                    title="Đơn hàng có chỉnh sửa đang chờ duyệt"
                                  ></i>
                                )}
                              </div>
                            );
                          }
                          if (canFinanceConfirm) {
                            return (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={(evt) => {
                                  evt.stopPropagation();
                                  handleFinanceConfirm(order);
                                }}
                                disabled={confirmingId === (order._id || order.id)}
                              >
                                {confirmingId === (order._id || order.id) ? 'Đang xác nhận...' : 'Xác nhận'}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">
                Trang {pagination.page}/{pagination.pages} • Tổng {pagination.total} đơn
              </span>
              <select
                className="form-select form-select-sm"
                style={{ width: '90px' }}
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <i className="bi bi-chevron-left"></i> Trước
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Sau <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card View - Mobile */}
      <div className="order-card-mobile">
        {tableLoading ? (
          <div className="text-center py-4">
            <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted py-4">
            Không có đơn hàng nào
          </div>
        ) : (
          orders.map((order) => {
            const canEdit = userRoles.includes('admin') || userRoles.includes('sale');
            const blocked = ['huy', 'da_gui_di', 'hoan_thanh', 'cat_vao_kho'].includes(order.status);
            return (
              <div
                key={order._id || order.id}
                className="order-card"
                onClick={() => setShowModal(true) || setSelectedOrderId(order._id || order.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="order-card-header">
                  <div className="order-card-code">
                    {order.orderCode}
                    <span className="text-muted ms-1">({getPaintingCount(order)})</span>
                  </div>
                  <div className="order-card-date">{formatDate(order.createdAt)}</div>
                </div>
                <div className="order-card-body">
                  {!hideCustomerColumn && (
                    <div className="order-card-field">
                      <div className="order-card-label">Khách hàng</div>
                      <div className="order-card-value">{order.customerName || '-'}</div>
                    </div>
                  )}
                  <div className="order-card-field">
                    <div className="order-card-label">SĐT/Zalo</div>
                    <div className="order-card-value">{order.customerPhone}</div>
                  </div>
                  <div className="order-card-field order-card-full-width">
                    <div className="order-card-label">Trạng thái</div>
                    <div className="order-card-badges">
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {getVnStatusName(order.status)}
                      </span>
                      {!hidePrintingStatusColumn && (
                        <span className={`badge ${getPrintingStatusBadgeClass(order.printingStatus || 'chua_in')}`}>
                          {getVnPrintingStatusName(order.printingStatus || 'chua_in')}
                        </span>
                      )}
                      {!hideFrameStatusColumn && (
                        <span className={`badge ${getFrameCuttingStatusBadgeClass(order.frameCuttingStatus || 'chua_cat')}`}>
                          {getVnFrameCuttingStatusName(order.frameCuttingStatus || 'chua_cat')}
                        </span>
                      )}
                      <span className={`badge ${getOrderTypeBadgeClass(order.orderType)}`}>
                        {getVnOrderTypeName(order.orderType)}
                      </span>
                    </div>
                  </div>
                  {showCreatorColumn && (
                    <div className="order-card-field">
                      <div className="order-card-label">Người tạo</div>
                      <div className="order-card-value">{order.createdBy?.fullName || order.createdBy?.email || '-'}</div>
                    </div>
                  )}
                   {canViewActualReceived && (
                     <div className="order-card-field">
                       <div className="order-card-label">Tiền thực nhận</div>
                       <div className="order-card-value">
                         {formatCurrency(calculateActualReceived(order))}
                       </div>
                    </div>
                  )}
                </div>
                {canEdit && !blocked && (
                  <div className="order-card-actions d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/orders/${order._id || order.id}/edit`}
                      className="btn btn-sm btn-primary"
                    >
                      <i className="bi bi-pencil"></i> Sửa
                    </Link>
                    {order.hasPendingMoneyDraft && (
                      <i
                        className="bi bi-exclamation-circle-fill text-danger"
                        style={{ fontSize: '1.1rem' }}
                        title="Đơn hàng có chỉnh sửa đang chờ duyệt"
                      ></i>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        show={showModal}
        onClose={() => { setShowModal(false); setSelectedOrderId(null); }}
        onOrderUpdated={() => {
          triggerRealtimeRefresh();
        }}
      />

      {/* Floating Create Order Button */}
      {(user?.roles?.includes('admin') || user?.roles?.includes('sale')) && (
        <Link to="/orders/create" className="floating-create-btn">
          <i className="bi bi-plus-circle"></i>
          <span className="floating-btn-text">Tạo đơn mới</span>
        </Link>
      )}
    </div>
  );
}

export default Orders;

