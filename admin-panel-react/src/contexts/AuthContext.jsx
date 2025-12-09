import { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe, useLogin as useLoginMutation, useLogout as useLogoutMutation, useUpdateProfile as useUpdateProfileMutation, useChangePassword as useChangePasswordMutation } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Sử dụng React Query để lấy thông tin user
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const hasToken = !!token;
  
  // Nếu có token, thử load user từ cache trước, sau đó fetch từ server
  const initialUser = hasToken && savedUser ? JSON.parse(savedUser) : null;
  
  const { data: user = initialUser, isLoading: loading, error } = useMe({
    enabled: hasToken, // Chỉ fetch khi có token
    onError: (err) => {
      // Nếu lỗi 401, xóa token và user (interceptor đã xử lý redirect)
      if (err?.response?.status === 401 || err?.message?.includes('401')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  });

  // Sync user với localStorage khi data thay đổi
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const login = async (email, password) => {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      return { success: true, user: result.user };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Đăng nhập thất bại'
      };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.warn('Failed to revoke session token', error);
    } finally {
      navigate('/login');
    }
  };

  const refreshUser = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      const user = queryClient.getQueryData(['auth', 'me']);
      if (user) {
        return { success: true, user };
      }
      return { success: false, message: 'Không thể tải thông tin người dùng' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Không thể tải thông tin người dùng'
      };
    }
  };

  const updateProfile = async (payload) => {
    try {
      const updatedUser = await updateProfileMutation.mutateAsync(payload);
      return { success: true, user: updatedUser, message: 'Cập nhật thành công' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Cập nhật thất bại'
      };
    }
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    try {
      const result = await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      return { 
        success: true, 
        message: result.message || 'Đổi mật khẩu thành công',
        user: result.data || user
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Đổi mật khẩu thất bại'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

