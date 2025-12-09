import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../lib/react-query';

const getDeviceMetadata = () => {
  if (typeof navigator === 'undefined') {
    return {
      deviceName: 'Unknown device',
      deviceType: 'web'
    };
  }

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const vendor = navigator.vendor || '';
  const friendlyName = [platform, vendor].filter(Boolean).join(' ').trim();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const isTablet = /tablet/i.test(userAgent);

  let deviceType = 'web';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';
  else if (platform) deviceType = 'desktop';

  return {
    deviceName: friendlyName || userAgent || 'Unknown device',
    deviceType
  };
};

// Hook để lấy thông tin user hiện tại
export const useMe = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch user');
    },
    retry: false, // Không retry khi lỗi
    retryOnMount: false, // Không retry khi mount lại
    refetchOnWindowFocus: false, // Không refetch khi window focus
    refetchOnReconnect: false, // Không refetch khi reconnect
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    ...options, // Cho phép override options
  });
};

// Hook để đăng nhập
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const metadata = getDeviceMetadata();
      const response = await api.post('/api/auth/login', { email, password, ...metadata });
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { user, token };
      }
      throw new Error(response.data.message || 'Login failed');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.me(), data.user);
    },
  });
};

// Hook để đăng xuất
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      queryClient.clear();
    },
  });
};

// Hook để cập nhật profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/api/auth/me', payload);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update profile');
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(queryKeys.me(), data);
      localStorage.setItem('user', JSON.stringify(data));
    },
  });
};

// Hook để đổi mật khẩu
export const useChangePassword = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to change password');
    },
    onSuccess: (data) => {
      // Update cache nếu có user data trả về
      if (data.data) {
        queryClient.setQueryData(queryKeys.me(), data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      }
    },
  });
};

// Hook để quên mật khẩu
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email) => {
      const response = await api.post('/api/auth/forgot-password', { email: email.trim() });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to send reset email');
    },
  });
};

// Hook để verify reset OTP
export const useVerifyResetOtp = () => {
  return useMutation({
    mutationFn: async ({ email, otp }) => {
      const response = await api.post('/api/auth/verify-reset-otp', {
        email: email.trim(),
        otp: otp.trim()
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Invalid OTP');
    },
  });
};

// Hook để reset mật khẩu
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ resetToken, newPassword }) => {
      const response = await api.post('/api/auth/reset-password', {
        resetToken,
        newPassword
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to reset password');
    },
  });
};

// Hook để đăng ký
export const useRegister = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/auth/register', data);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to register');
    },
  });
};





