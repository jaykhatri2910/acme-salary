import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeDetail } from '../../pages/EmployeeDetail';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('EmployeeDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployeeDetail = {
    data: {
      id: 'emp-1',
      employeeNo: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john.doe@acme.com',
      department: { id: 'dept-1', name: 'Engineering' },
      country: { id: 'cnt-1', name: 'United States', code: 'US' },
      employmentStatus: 'active',
      currentSalary: {
        id: 'sal-1',
        amount: 95000,
        currencyCode: 'USD',
        effectiveDate: '2026-08-01',
        payFrequency: 'annual',
        grade: 'G6',
        band: 'Senior',
      },
    },
  };

  const mockEmployeeNoSalary = {
    data: {
      ...mockEmployeeDetail.data,
      currentSalary: null,
    },
  };

  it('renders employee profile and compensation details correctly', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockEmployeeDetail });
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employees/emp-1']}>
          <Routes>
            <Route path="/employees/:id" element={<EmployeeDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for content load
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('john.doe@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('United States (US)')).toBeInTheDocument();

    // Verify formatted salary details
    expect(screen.getByText('$95,000')).toBeInTheDocument();
    expect(screen.getByText(/annual/i)).toBeInTheDocument();
    expect(screen.getByText('G6')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('August 1, 2026')).toBeInTheDocument();
  });

  it('handles null currentSalary gracefully', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockEmployeeNoSalary });
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employees/emp-1']}>
          <Routes>
            <Route path="/employees/:id" element={<EmployeeDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('No active salary record')).toBeInTheDocument();
  });
});
