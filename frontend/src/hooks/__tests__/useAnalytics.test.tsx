import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useAnalytics, exportSalaryCsv } from '../useAnalytics';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockSummaryData = {
  data: {
    headcount: 10000,
    totalPayrollUsd: 850000000,
    averageSalaryUsd: 85000,
    medianSalaryUsd: 82000,
    minSalaryUsd: 30000,
    maxSalaryUsd: 250000,
    byDepartment: [
      {
        department: 'Engineering',
        headcount: 2500,
        totalPayrollUsd: 250000000,
        averageSalaryUsd: 100000,
        medianSalaryUsd: 97000,
        minSalaryUsd: 50000,
        maxSalaryUsd: 250000,
      },
    ],
    byCountry: [
      {
        country: 'United States',
        countryCode: 'US',
        headcount: 4000,
        totalPayrollUsd: 400000000,
        averageSalaryUsd: 100000,
        medianSalaryUsd: 95000,
        minSalaryUsd: 40000,
        maxSalaryUsd: 250000,
      },
    ],
    payBandDistribution: [
      { band: 'Junior', headcount: 2500 },
      { band: 'Mid', headcount: 4000 },
      { band: 'Senior', headcount: 3000 },
      { band: 'Lead', headcount: 500 },
    ],
  },
};

describe('useAnalytics hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches analytics summary without filters', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSummaryData });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.get).toHaveBeenCalledWith('/analytics/summary', {
      params: { department: undefined, country: undefined },
    });
    expect(result.current.data).toEqual(mockSummaryData);
  });

  it('passes department and country filters in params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSummaryData });

    const { result } = renderHook(
      () =>
        useAnalytics({
          department: 'dept-123',
          country: 'cnt-456',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.get).toHaveBeenCalledWith('/analytics/summary', {
      params: { department: 'dept-123', country: 'cnt-456' },
    });
  });

  it('exportSalaryCsv fetches blob from /analytics/export and triggers browser download', async () => {
    const csvContent = 'employee_no,employee_name,department\nEMP-001,John Doe,Engineering';
    vi.mocked(api.get).mockResolvedValueOnce({ data: csvContent });

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportSalaryCsv({ department: 'dept-123', status: 'active' });

    expect(api.get).toHaveBeenCalledWith('/analytics/export', {
      params: {
        search: undefined,
        department: 'dept-123',
        country: undefined,
        status: 'active',
        sortBy: undefined,
        sortOrder: undefined,
      },
      responseType: 'blob',
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-url');

    clickSpy.mockRestore();
  });
});
