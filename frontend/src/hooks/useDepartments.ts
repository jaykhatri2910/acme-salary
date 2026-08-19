import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface Department {
  id: string;
  name: string;
}

export const useDepartments = () => {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
