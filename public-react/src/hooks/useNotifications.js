import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../lib/react-query';

// Hook để lấy danh sách notifications
export const useNotifications = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.notifications(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      const queryString = params.toString();
      const url = `/api/notifications${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch notifications');
    },
  });
};

// Hook để lấy unread notifications count
export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: [...queryKeys.notifications(), 'count'],
    queryFn: async () => {
      const response = await api.get('/api/notifications?limit=1&unreadOnly=true');
      if (response.data.success) {
        return response.data.total || 0;
      }
      return 0;
    },
    refetchInterval: 30000, // Refetch mỗi 30 giây
  });
};

// Hook để lấy recent notifications (cho bell)
export const useRecentNotifications = (limit = 10) => {
  return useQuery({
    queryKey: [...queryKeys.notifications(), 'recent', limit],
    queryFn: async () => {
      const response = await api.get(`/api/notifications?limit=${limit}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch notifications');
    },
    refetchInterval: 30000, // Refetch mỗi 30 giây
  });
};

// Hook để mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to mark notification as read');
    },
    onSuccess: () => {
      // Invalidate tất cả queries notifications (list, count, recent)
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'notifications'
      });
    },
  });
};

// Hook để mark all notifications as read
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.patch('/api/notifications/read-all');
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to mark all notifications as read');
    },
    onSuccess: () => {
      // Invalidate tất cả queries notifications (list, count, recent)
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'notifications'
      });
    },
  });
};

