import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import Loading from '../components/Loading';
import { formatCurrency, getVnStatusName } from '../utils/orderUtils';
import '../styles/Orders.css';
import { useAuth } from '../contexts/AuthContext';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildQuickRange = (rangeKey) => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (rangeKey) {
    case 'today': {
      // Đảm bảo cả start và end đều là ngày hôm nay
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start.setTime(today.getTime());
      end.setTime(today.getTime());
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      start.setDate(now.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'lastWeek': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      end.setDate(now.getDate() - day);
      end.setHours(23, 59, 59, 999);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
};

const getUserId = (userObj) => userObj?._id || userObj?.id || userObj;

const calculateActualReceived = (order) => {
  const actual = Number(order?.actualReceivedAmount || 0);
  if (actual > 0) return actual;

  const cod = Number(order?.cod || 0);
  if (cod > 0) return cod;

  const total = Number(order?.totalAmount || 0);
  const deposit = Number(order?.depositAmount || 0);
  const fallback = total - deposit;
  return fallback > 0 ? fallback : 0;
};

function Cashflow() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    saleId: '',
    quickRange: 'thisMonth',
  });

  const userId = getUserId(user);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isSaleOnly = roles.includes('sale') && !roles.includes('admin') && !roles.includes('marketing') && !roles.includes('keToanTaiChinh') && !roles.includes('keToanDieuDon');

  const loadSales = async () => {
    try {
      const response = await api.get('/api/orders/sales');
      if (response.data.success) {
        setSales(response.data.data || []);
      }
    } catch (err) {
      console.error('Không lấy được danh sách sale:', err);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/orders?limit=2000');
      if (response.data.success) {
        setOrders(response.data.data || []);
      } else {
        setError(response.data.message || 'Không lấy được dữ liệu đơn hàng');
      }
    } catch (err) {
      setError(err.message || 'Không lấy được dữ liệu đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const quick = buildQuickRange(filters.quickRange);
    setFilters((prev) => ({
      ...prev,
      startDate: quick.startDate,
      endDate: quick.endDate,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([loadSales(), loadOrders()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSaleOnly && userId) {
      setFilters((prev) => ({ ...prev, saleId: userId }));
    }
  }, [isSaleOnly, userId]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'quickRange'
        ? buildQuickRange(value)
        : {}),
    }));
  };

  const filteredOrders = useMemo(() => {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const created = order?.createdAt ? new Date(order.createdAt) : null;
      if (start && created && created < start) return false;
      if (end && created && created > end) return false;

      if (filters.status === 'hoan_thanh' && order.status !== 'hoan_thanh') return false;
      if (filters.status === 'chua_hoan_thanh' && ['hoan_thanh', 'huy'].includes(order.status)) return false;
      if (filters.status === 'khach_tra_hang' && order.status !== 'khach_tra_hang') return false;
      if (filters.status === 'huy' && order.status !== 'huy') return false;

      if (filters.saleId) {
        const creatorId = getUserId(order.createdBy);
        if (creatorId !== filters.saleId) return false;
      }

      return true;
    });
  }, [filters, orders]);

  const summary = useMemo(() => {
    const totals = {
      totalAmount: 0,
      paintingRevenue: 0,
      depositAmount: 0,
      cod: 0,
      shippingCharge: 0,
      externalShippingCost: 0,
      actualReceived: 0,
      returnedAmount: 0,
      completedAmount: 0,
      incompleteAmount: 0,
      completedCount: 0,
      incompleteCount: 0,
      totalCount: filteredOrders.length,
    };

    filteredOrders.forEach((order) => {
      const totalAmount = Number(order.totalAmount || 0);
      const depositAmount = Number(order.depositAmount || 0);
      const cod = Number(order.cod || 0);
      const paintingRevenue = Number(order.paintingPrice || 0);
      const shippingInstallationPrice = Number(order.shippingInstallationPrice || 0);
      const shippingExternalCost = Number(order.shippingExternalCost || 0);
      const actualReceived = calculateActualReceived(order);

      totals.totalAmount += totalAmount;
      totals.paintingRevenue += paintingRevenue;
      totals.depositAmount += depositAmount;
      totals.cod += cod;
      totals.shippingCharge += shippingInstallationPrice;
      totals.externalShippingCost += shippingExternalCost;
      totals.actualReceived += actualReceived;

      if (order.status === 'khach_tra_hang') {
        totals.returnedAmount += actualReceived;
      }

      if (order.status === 'hoan_thanh') {
        totals.completedAmount += totalAmount;
        totals.completedCount += 1;
      } else if (order.status !== 'huy') {
        totals.incompleteAmount += totalAmount;
        totals.incompleteCount += 1;
      }
    });

    // Công nợ mới: Tổng đơn - (Thực nhận + Cọc)
    totals.debt = totals.totalAmount - (totals.actualReceived + totals.depositAmount);
    return totals;
  }, [filteredOrders]);

  return (
    <div className="container-fluid orders-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Thống kê dòng tiền</h3>
          <small className="text-muted">Tính trên dữ liệu đơn hàng hiện có</small>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className={`btn btn-sm ${filters.quickRange === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'today')}
          >
            Hôm nay
          </button>
          <button
            className={`btn btn-sm ${filters.quickRange === 'yesterday' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'yesterday')}
          >
            Hôm qua
          </button>
          <button
            className={`btn btn-sm ${filters.quickRange === 'thisWeek' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'thisWeek')}
          >
            Tuần này
          </button>
          <button
            className={`btn btn-sm ${filters.quickRange === 'lastWeek' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'lastWeek')}
          >
            Tuần trước
          </button>
          <button
            className={`btn btn-sm ${filters.quickRange === 'thisMonth' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'thisMonth')}
          >
            Tháng này
          </button>
          <button
            className={`btn btn-sm ${filters.quickRange === 'lastMonth' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleFilterChange('quickRange', 'lastMonth')}
          >
            Tháng trước
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label mb-1">Từ ngày</label>
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1">Đến ngày</label>
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1">Trạng thái</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="hoan_thanh">Hoàn thành</option>
                <option value="chua_hoan_thanh">Chưa hoàn thành</option>
                <option value="khach_tra_hang">Khách trả hàng</option>
                <option value="huy">Hủy</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1">Sale</label>
              <select
                className="form-select"
                value={filters.saleId}
                onChange={(e) => handleFilterChange('saleId', e.target.value)}
                disabled={isSaleOnly}
              >
                <option value="">Tất cả</option>
                {sales.map((sale) => (
                  <option key={sale._id} value={sale._id}>
                    {sale.fullName || sale.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-lg-3 col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Tổng số đơn</div>
                  <h4 className="mb-1">{summary.totalCount}</h4>
                  <div className="small text-success">Hoàn thành: {summary.completedCount}</div>
                  <div className="small text-warning">Chưa hoàn thành: {summary.incompleteCount}</div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Doanh thu (tổng tiền đơn)</div>
                  <h5 className="mb-1">{formatCurrency(summary.totalAmount)}</h5>
                  <div className="small text-success">Hoàn thành: {formatCurrency(summary.completedAmount)}</div>
                  <div className="small text-warning">Chưa hoàn thành: {formatCurrency(summary.incompleteAmount)}</div>
                  <div className="small text-primary mt-1">Doanh số (tiền tranh): <strong>{formatCurrency(summary.paintingRevenue)}</strong></div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Doanh số (tiền tranh)</div>
                  <h5 className="mb-1">{formatCurrency(summary.paintingRevenue)}</h5>
                  <div className="small text-danger">Công nợ: {formatCurrency(summary.debt)}</div>
                  <div className="small text-secondary">Khách trả hàng: {formatCurrency(summary.returnedAmount)}</div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Chi tiết thu/chi</div>
                  <div className="small">Cọc: <strong>{formatCurrency(summary.depositAmount)}</strong></div>
                  <div className="small">COD: <strong>{formatCurrency(summary.cod)}</strong></div>
                  <div className="small">Phí ship thu của KH: <strong>{formatCurrency(summary.shippingCharge)}</strong></div>
                  <div className="small">Chi phí ship ngoài: <strong>{formatCurrency(summary.externalShippingCost)}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Kết quả ({filteredOrders.length} đơn)</span>
              <small className="text-muted">Hiển thị nhanh để kiểm tra chi tiết từng đơn</small>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                    <th>Cọc</th>
                    <th>COD</th>
                    <th>Thực nhận</th>
                    <th>Ship ngoài</th>
                    <th>Sale</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id || order.id}>
                      <td>{order.orderCode}</td>
                      <td>
                        <div className="fw-semibold">{order.customerName || 'Khách lẻ'}</div>
                        <div className="text-muted small">{order.customerPhone}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {getVnStatusName(order.status)}
                        </span>
                      </td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td>{formatCurrency(order.depositAmount)}</td>
                      <td>{formatCurrency(order.cod)}</td>
                      <td>{formatCurrency(calculateActualReceived(order))}</td>
                      <td>{formatCurrency(order.shippingExternalCost)}</td>
                      <td className="small">
                        {order.createdBy?.fullName || order.createdBy?.email || 'N/A'}
                      </td>
                      <td className="small">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center text-muted py-4">
                        Không có dữ liệu phù hợp bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Cashflow;

