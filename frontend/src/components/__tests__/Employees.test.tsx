import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Employees } from '../../pages/Employees';
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

describe('Employees Directory Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployeesData = {
    data: [
      {
        id: 'emp-1',
        employeeNo: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'john.doe@acme.com',
        department: { id: 'dept-1', name: 'Engineering' },
        country: { id: 'cnt-1', name: 'United States', code: 'US' },
        employmentStatus: 'active',
        currentSalary: { amount: 95000, currencyCode: 'USD', payFrequency: 'annual' },
      },
    ],
    meta: {
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    },
  };

  it('restores state from URL parameters on mount and queries backend with correct params', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: { data: [] } });
      if (url === '/countries') return Promise.resolve({ data: { data: [] } });
      if (url === '/employees') {
        return Promise.resolve({ data: mockEmployeesData });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/employees?search=Bob&page=2&status=active&sortBy=salary&sortOrder=desc',
          ]}
        >
          <Routes>
            <Route path="/employees" element={<Employees />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify search input restores value
    const searchInput = screen.getByPlaceholderText(/search name or ID/i) as HTMLInputElement;
    expect(searchInput.value).toBe('Bob');

    // Wait for the query to load and assert correct params are sent to backend
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/employees',
        expect.objectContaining({
          params: expect.objectContaining({
            page: 2,
            search: 'Bob',
            status: 'active',
            sortBy: 'salary',
            sortOrder: 'desc',
          }),
        })
      );
    });
  });

  it('debounces search inputs and resets page parameter to 1', async () => {
    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({ data: { data: [], meta: { page: 1, totalPages: 0 } } })
    );
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employees?page=3']}>
          <Employees />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search name or ID/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // Instantly check: search has not triggered because of 300ms debounce
    expect(api.get).not.toHaveBeenCalledWith(
      '/employees',
      expect.objectContaining({
        params: expect.objectContaining({ search: 'Alice' }),
      })
    );

    // Wait for 300ms debounce to fire and assert query key update and page reset
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/employees',
        expect.objectContaining({
          params: expect.objectContaining({
            page: 1, // Reset pagination to page 1 on filter/search change
            search: 'Alice',
          }),
        })
      );
    });
  });
});
