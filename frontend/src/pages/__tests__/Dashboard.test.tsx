import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../Dashboard';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockSummary = {
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
      { band: 'Senior', headcount: 3000 },
      { band: 'Junior', headcount: 2500 },
    ],
  },
};

const mockDepartments = {
  data: [
    { id: 'dept-1', name: 'Engineering' },
    { id: 'dept-2', name: 'Product' },
  ],
};

const mockCountries = {
  data: [
    { id: 'cnt-1', name: 'United States', code: 'US' },
    { id: 'cnt-2', name: 'India', code: 'IN' },
  ],
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
);

describe('Dashboard Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupDefaultMocks = () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: mockDepartments });
      if (url === '/countries') return Promise.resolve({ data: mockCountries });
      if (url === '/analytics/summary') return Promise.resolve({ data: mockSummary });
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  };

  it('renders header, filter controls, KPI cards, charts, and regional table', async () => {
    setupDefaultMocks();
    render(wrap(<Dashboard />));

    // Header & Subtitle
    expect(screen.getByText('Executive Salary Analytics')).toBeInTheDocument();
    expect(
      screen.getByText(/Real-time workforce compensation insights and departmental distribution/i),
    ).toBeInTheDocument();

    // Summary Cards (wait for query data)
    expect(await screen.findByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('$850,000,000')).toBeInTheDocument();
    expect(screen.getByText('$85,000')).toBeInTheDocument();
    expect(screen.getByText('$82,000')).toBeInTheDocument();
    expect(screen.getByText('$30,000 – $250,000')).toBeInTheDocument();

    // Department Breakdown
    expect(screen.getByText('Department Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('Engineering').length).toBeGreaterThanOrEqual(1);

    // Pay Band Distribution
    expect(screen.getByText('Pay Band Distribution')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();

    // Regional Table
    expect(screen.getByText('Regional Compensation Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('United States').length).toBeGreaterThanOrEqual(1);
  });

  it('filters analytics by department and country, and resets filters', async () => {
    setupDefaultMocks();
    render(wrap(<Dashboard />));

    // Wait for initial load
    expect(await screen.findByText('10,000')).toBeInTheDocument();

    // Change Department Filter
    const deptSelect = screen.getByLabelText(/filter by department/i);
    await userEvent.selectOptions(deptSelect, 'dept-1');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/analytics/summary', {
        params: { department: 'dept-1', country: undefined },
      });
    });

    // Reset Filters button appears
    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    expect(resetBtn).toBeInTheDocument();

    // Change Country Filter
    const countrySelect = screen.getByLabelText(/filter by country/i);
    await userEvent.selectOptions(countrySelect, 'cnt-1');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/analytics/summary', {
        params: { department: 'dept-1', country: 'cnt-1' },
      });
    });

    // Click Reset Filters
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/analytics/summary', {
        params: { department: undefined, country: undefined },
      });
    });
  });

  it('triggers CSV export with active filters', async () => {
    setupDefaultMocks();

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(wrap(<Dashboard />));
    expect(await screen.findByText('10,000')).toBeInTheDocument();

    // Select Department filter
    await userEvent.selectOptions(screen.getByLabelText(/filter by department/i), 'dept-1');

    // Click Export CSV
    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/analytics/export', {
        params: {
          search: undefined,
          department: 'dept-1',
          country: undefined,
          status: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        responseType: 'blob',
      });
    });

    clickSpy.mockRestore();
  });

  it('displays error message if CSV export fails', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: mockDepartments });
      if (url === '/countries') return Promise.resolve({ data: mockCountries });
      if (url === '/analytics/summary') return Promise.resolve({ data: mockSummary });
      if (url === '/analytics/export') return Promise.reject(new Error('Export streaming error'));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(wrap(<Dashboard />));
    expect(await screen.findByText('10,000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(await screen.findByText('Export streaming error')).toBeInTheDocument();

    // Dismiss error
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Export streaming error')).not.toBeInTheDocument();
  });

  it('renders error state and handles retry on API failure', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: mockDepartments });
      if (url === '/countries') return Promise.resolve({ data: mockCountries });
      if (url === '/analytics/summary') return Promise.reject(new Error('Server unavailable'));
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(wrap(<Dashboard />));

    expect(await screen.findByText('Failed to load salary analytics')).toBeInTheDocument();
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Mock recovery on retry
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: mockDepartments });
      if (url === '/countries') return Promise.resolve({ data: mockCountries });
      if (url === '/analytics/summary') return Promise.resolve({ data: mockSummary });
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    fireEvent.click(retryBtn);

    expect(await screen.findByText('10,000')).toBeInTheDocument();
  });
});
