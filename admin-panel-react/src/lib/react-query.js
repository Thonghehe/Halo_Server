import { QueryClient } from '@tanstack/react-query';

// Tạo QueryClient với cấu hình mặc định
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Thời gian cache mặc định: 5 phút
      staleTime: 5 * 60 * 1000,
      // Thời gian giữ data trong cache: 10 phút
      gcTime: 10 * 60 * 1000, // Trước đây là cacheTime
      // Tự động refetch khi window được focus
      refetchOnWindowFocus: true,
      // Retry khi lỗi
      retry: 1,
      // Không refetch khi mount lại nếu data còn fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry khi mutation lỗi
      retry: 0,
    },
  },
});

// Query keys - để quản lý cache keys dễ dàng
export const queryKeys = {
  // Orders
  orders: (filters = {}) => ['orders', filters],
  order: (id) => ['orders', id],
  orderDetail: (id) => ['orderDetail', id],
  sales: () => ['sales'],
  
  // Users
  users: () => ['users'],
  pendingUsers: () => ['users', 'pending'],
  user: (id) => ['users', id],
  
  // Auth
  me: () => ['auth', 'me'],
  
  // Notifications
  notifications: (filters = {}) => ['notifications', filters],
};

