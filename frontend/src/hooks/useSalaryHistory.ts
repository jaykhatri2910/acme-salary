import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api';

export interface SalaryHistoryEntry {
  id: string;
  oldAmount: number | null;
  newAmount: number;
  currencyCode: string;
  effectiveDate: string;
  payFrequency: string;
  grade: string | null;
  band: string | null;
  reason: string;
  notes: string | null;
  changedBy: { id: string; email: string };
  createdAt: string;
}

export interface SalaryHistoryResponse {
  data: SalaryHistoryEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const useSalaryHistory = (
  employeeId: string,
  page: number = 1,
  pageSize: number = 25,
) => {
  return useQuery<SalaryHistoryResponse>({
    queryKey: ['salaryHistory', employeeId, page, pageSize],
    queryFn: async () => {
      const res = await api.get(`/employees/${employeeId}/salary/history`, {
        params: { page, pageSize },
      });
      return res.data;
    },
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
  });
};
