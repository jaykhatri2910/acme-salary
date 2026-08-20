import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useSalaryHistory } from '../useSalaryHistory';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('useSalaryHistory hook', () => {
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

  it('fetches salary history with pagination params and employeeId in path', async () => {
    const mockData = {
      data: [
        {
          id: 'sal-1',
          oldAmount: null,
          newAmount: 95000,
          currencyCode: 'GBP',
          effectiveDate: '2026-01-01',
          payFrequency: 'annual',
          grade: 'G6',
          band: 'Senior',
          reason: 'Initial salary',
          notes: null,
          changedBy: { id: 'u-1', email: 'hr@acme.com' },
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useSalaryHistory('emp-123', 1, 25), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.get).toHaveBeenCalledWith('/employees/emp-123/salary/history', {
      params: { page: 1, pageSize: 25 },
    });
    expect(result.current.data).toEqual(mockData);
  });
});
