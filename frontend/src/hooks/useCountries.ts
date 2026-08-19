import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface Country {
  id: string;
  name: string;
  code: string;
}

export const useCountries = () => {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await api.get('/countries');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
