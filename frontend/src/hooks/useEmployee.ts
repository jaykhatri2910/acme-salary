import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface DetailedEmployeeSalary {
  id: string;
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  payFrequency: string;
  grade: string | null;
  band: string | null;
}

export interface DetailedEmployee {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
    code: string;
  };
  employmentStatus: 'active' | 'inactive';
  currentSalary: DetailedEmployeeSalary | null;
}

export interface EmployeeResponse {
  data: DetailedEmployee;
}

export const useEmployee = (id: string) => {
  return useQuery<EmployeeResponse>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await api.get(`/employees/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};
