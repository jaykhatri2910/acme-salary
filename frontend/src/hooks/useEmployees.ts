import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api';

export interface EmployeeSalary {
  amount: number;
  currencyCode: string;
  payFrequency: string;
}

export interface Employee {
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
  currentSalary: EmployeeSalary | null;
}

export interface EmployeesResponse {
  data: Employee[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface useEmployeesParams {
  page: number;
  pageSize: number;
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const useEmployees = (params: useEmployeesParams) => {
  return useQuery<EmployeesResponse>({
    queryKey: ['employees', params],
    queryFn: async () => {
      const res = await api.get('/employees', {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search || undefined,
          department: params.department || undefined,
          country: params.country || undefined,
          status: params.status || undefined,
          sortBy: params.sortBy || undefined,
          sortOrder: params.sortOrder || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
};
