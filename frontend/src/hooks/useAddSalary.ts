import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Exact fields from the API contract — no extras
export interface AddSalaryPayload {
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  payFrequency: 'monthly' | 'annual';
  reason: string;
  grade?: string;
  band?: string;
  notes?: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  amount: number;
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

export const useAddSalary = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation<{ data: SalaryRecord }, Error, AddSalaryPayload>({
    mutationFn: async (payload) => {
      // Only contract fields are sent — changedBy/employeeId/etc. are never included
      const body: AddSalaryPayload = {
        amount: payload.amount,
        currencyCode: payload.currencyCode.toUpperCase(),
        effectiveDate: payload.effectiveDate,
        payFrequency: payload.payFrequency,
        reason: payload.reason,
        ...(payload.grade ? { grade: payload.grade } : {}),
        ...(payload.band ? { band: payload.band } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      };
      const res = await api.post(`/employees/${employeeId}/salary`, body);
      return res.data;
    },
    onSuccess: () => {
      // Refresh current salary on the employee detail card
      void queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      // Refresh salary history table (all pages)
      void queryClient.invalidateQueries({ queryKey: ['salaryHistory', employeeId] });
    },
  });
};
