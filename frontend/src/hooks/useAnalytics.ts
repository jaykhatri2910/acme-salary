import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api';

export interface AnalyticsFilters {
  department?: string;
  country?: string;
}

export interface DepartmentBreakdown {
  department: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

export interface CountryBreakdown {
  country: string;
  countryCode: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
}

export interface PayBandDistribution {
  band: string | null;
  headcount: number;
}

export interface AnalyticsSummary {
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
  byDepartment: DepartmentBreakdown[];
  byCountry: CountryBreakdown[];
  payBandDistribution: PayBandDistribution[];
}

export interface AnalyticsSummaryResponse {
  data: AnalyticsSummary;
}

export interface ExportFilters {
  search?: string;
  department?: string;
  country?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Fetch salary and workforce analytics summary from GET /analytics/summary.
 * Only supports department and country filters as per backend API contract.
 */
export const useAnalytics = (filters: AnalyticsFilters = {}) => {
  return useQuery<AnalyticsSummaryResponse>({
    queryKey: ['analytics', filters.department || '', filters.country || ''],
    queryFn: async () => {
      const res = await api.get('/analytics/summary', {
        params: {
          department: filters.department || undefined,
          country: filters.country || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
};

/**
 * Trigger CSV export download from GET /analytics/export.
 */
export const exportSalaryCsv = async (filters: ExportFilters = {}): Promise<void> => {
  const res = await api.get('/analytics/export', {
    params: {
      search: filters.search || undefined,
      department: filters.department || undefined,
      country: filters.country || undefined,
      status: filters.status || undefined,
      sortBy: filters.sortBy || undefined,
      sortOrder: filters.sortOrder || undefined,
    },
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'salary-export.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
