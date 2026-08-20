import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useAddSalary } from '../useAddSalary';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('useAddSalary hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('posts mutation payload to /employees/:id/salary with only contract fields', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          id: 'sal-123',
          employeeId: 'emp-42',
          amount: 110000,
          currencyCode: 'EUR',
          effectiveDate: '2026-05-01',
          payFrequency: 'monthly',
          grade: 'G5',
          band: 'Senior',
          reason: 'Promotion',
          notes: 'Promoted to Lead Engineer',
          changedBy: { id: 'u-1', email: 'hr@acme.com' },
          createdAt: '2026-05-01T00:00:00Z',
        },
      },
    });

    const { result } = renderHook(() => useAddSalary('emp-42'), { wrapper });

    result.current.mutate({
      amount: 110000,
      currencyCode: 'eur',
      effectiveDate: '2026-05-01',
      payFrequency: 'monthly',
      reason: 'Promotion',
      grade: 'G5',
      band: 'Senior',
      notes: 'Promoted to Lead Engineer',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, body] = vi.mocked(api.post).mock.calls[0];

    // Employee ID belongs only in the URL
    expect(url).toBe('/employees/emp-42/salary');

    // Expected contract fields
    expect(body).toEqual({
      amount: 110000,
      currencyCode: 'EUR',
      effectiveDate: '2026-05-01',
      payFrequency: 'monthly',
      reason: 'Promotion',
      grade: 'G5',
      band: 'Senior',
      notes: 'Promoted to Lead Engineer',
    });

    // Explicit check: forbidden fields must never exist in the payload
    expect(body).not.toHaveProperty('employeeId');
    expect(body).not.toHaveProperty('changedBy');
    expect(body).not.toHaveProperty('oldAmount');
    expect(body).not.toHaveProperty('oldCurrencyCode');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('id');
  });

  it('invalidates ["employee", employeeId] and ["salaryHistory", employeeId] on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: { id: 'sal-1' },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddSalary('emp-42'), { wrapper });

    result.current.mutate({
      amount: 80000,
      currencyCode: 'USD',
      effectiveDate: '2026-06-01',
      payFrequency: 'annual',
      reason: 'Annual increase',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['employee', 'emp-42'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['salaryHistory', 'emp-42'],
    });
  });
});
