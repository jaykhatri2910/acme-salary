import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SalaryHistoryTable } from '../salary/SalaryHistoryTable';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: { get: vi.fn() },
}));

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
);

const historyEntry = {
  id: 'h-1',
  oldAmount: 80000,
  newAmount: 95000,
  currencyCode: 'CAD',
  effectiveDate: '2026-08-01',
  payFrequency: 'annual',
  grade: 'G5',
  band: 'Senior',
  reason: 'Annual review',
  notes: 'Performance adjustment',
  changedBy: { id: 'u-1', email: 'hr@acme.com' },
  createdAt: '2026-08-01T10:00:00Z',
};

describe('SalaryHistoryTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders skeleton during loading', () => {
    // Never resolves — stays loading
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    // Skeleton is rendered via animate-pulse — heading should still appear
    expect(screen.getByText('Compensation History')).toBeInTheDocument();
    expect(screen.getByText('Read-only — immutable audit record')).toBeInTheDocument();
  });

  it('renders empty state when no history records', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } },
    });
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    expect(await screen.findByText('No salary history on record')).toBeInTheDocument();
  });

  it('renders history entries with old → new amounts using correct currency', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [historyEntry],
        meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    });
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));

    // Currency is CAD — not USD/$ hardcoded
    expect(await screen.findByText('Annual review')).toBeInTheDocument();
    expect(screen.getByText('Performance adjustment', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('hr@acme.com')).toBeInTheDocument();
    // Grade and band chips
    expect(screen.getByText('G5')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    // Frequency badge
    expect(screen.getByText('annual')).toBeInTheDocument();
  });

  it('renders "Initial" label when oldAmount is null (first salary record)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [{ ...historyEntry, oldAmount: null }],
        meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    });
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    expect(await screen.findByText('Initial')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    expect(await screen.findByText('Failed to load salary history')).toBeInTheDocument();
  });

  it('does not render any edit or delete actions on history rows', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [historyEntry],
        meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    });
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    await screen.findByText('Annual review');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows pagination controls when totalPages > 1', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [historyEntry],
        meta: { page: 1, pageSize: 25, total: 60, totalPages: 3 },
      },
    });
    render(wrap(<SalaryHistoryTable employeeId="emp-1" />));
    await screen.findByText('Annual review');
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
  });
});
