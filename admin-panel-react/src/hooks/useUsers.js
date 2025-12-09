import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../lib/react-query';

// Hook để lấy danh sách users
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      const response = await api.get('/api/admin/users');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch users');
    },
  });
};

// Hook để lấy danh sách pending users
export const usePendingUsers = () => {
  return useQuery({
    queryKey: queryKeys.pendingUsers(),
    queryFn: async () => {
      const response = await api.get('/api/admin/users/pending');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch pending users');
    },
  });
};

// Hook để lấy chi tiết user
export const useUser = (userId) => {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: async () => {
      const response = await api.get(`/api/admin/users/${userId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch user');
    },
    enabled: !!userId,
  });
};

// Hook để approve user
export const useApproveUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId) => {
      const response = await api.patch(`/api/admin/users/${userId}/approve`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to approve user');
    },
    onSuccess: (data, userId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingUsers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    },
  });
};

// Hook để reject user
export const useRejectUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete(`/api/admin/users/${userId}/reject`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to reject user');
    },
    onSuccess: (data, userId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingUsers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    },
  });
};

// Hook để toggle active status của user
export const useToggleUserActive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId) => {
      const response = await api.patch(`/api/admin/users/${userId}/toggle-active`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to toggle user active status');
    },
    onSuccess: (data, userId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    },
  });
};

// Hook để cập nhật roles của user
export const useUpdateUserRoles = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, roles }) => {
      const response = await api.put(`/api/admin/users/${userId}`, { roles });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update user roles');
    },
    onSuccess: (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.userId) });
    },
  });
};





