import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../lib/react-query';

// Hook để lấy danh sách orders
export const useOrders = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.orders(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, value);
      });
      const queryString = params.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      if (response.data.success) {
        return {
          data: response.data.data,
          pagination: response.data.pagination || null
        };
      }
      throw new Error(response.data.message || 'Failed to fetch orders');
    },
    // Giữ data cũ khi refetch để tránh loading mãi
    placeholderData: (previousData) => previousData,
  });
};

// Hook để lấy tất cả orders (không phân trang)
export const useAllOrders = () => {
  return useQuery({
    queryKey: queryKeys.orders({ all: true }),
    queryFn: async () => {
      const response = await api.get('/api/orders?limit=1000');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch all orders');
    },
  });
};

// Hook để lấy danh sách sales users
export const useSales = () => {
  return useQuery({
    queryKey: queryKeys.sales(),
    queryFn: async () => {
      const response = await api.get('/api/orders/sales');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch sales');
    },
  });
};

// Hook để lấy chi tiết order
export const useOrder = (orderId) => {
  return useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: async () => {
      const response = await api.get(`/api/orders/${orderId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch order');
    },
    enabled: !!orderId,
  });
};

// Hook để tạo order mới
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData) => {
      const response = await api.post('/api/orders', orderData);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to create order');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrders() });
    },
  });
};

// Hook để cập nhật order
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, data }) => {
      const response = await api.patch(`/api/orders/${orderId}`, data);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update order');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrders() });
    },
  });
};

// Hook để cập nhật status của order
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status, note }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, {
        status,
        note,
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update order status');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrders() });
    },
  });
};





