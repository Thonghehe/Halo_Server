import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

// Hook để lấy danh sách mentionable users
export const useMentionableUsers = () => {
  return useQuery({
    queryKey: ['mentionableUsers'],
    queryFn: async () => {
      const response = await api.get('/api/orders/mentionable-users');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch mentionable users');
    },
    staleTime: 5 * 60 * 1000,
  });
};

