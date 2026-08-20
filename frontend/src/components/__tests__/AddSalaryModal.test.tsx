import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddSalaryModal } from '../salary/AddSalaryModal';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  employeeId: 'emp-1',
  employeeName: 'John Doe',
};

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
);

describe('AddSalaryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pay frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/effective date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('shows immutability warning', () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    expect(screen.getByText(/permanent, immutable/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));
    expect(await screen.findByText(/amount must be a number/i)).toBeInTheDocument();
    expect(await screen.findByText(/reason is required/i)).toBeInTheDocument();
  });

  it('rejects amount = 0', async () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    await userEvent.type(screen.getByLabelText(/amount/i), '0');
    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));
    expect(await screen.findByText(/amount must be greater than zero/i)).toBeInTheDocument();
  });

  it('rejects currencyCode not exactly 3 characters', async () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    await userEvent.type(screen.getByLabelText(/currency/i), 'US');
    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));
    expect(await screen.findByText(/must be exactly 3 characters/i)).toBeInTheDocument();
  });

  it('rejects a future effectiveDate', async () => {
    render(wrap(<AddSalaryModal {...defaultProps} />));
    // Set a date far in the future
    fireEvent.change(screen.getByLabelText(/effective date/i), {
      target: { value: '2099-12-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));
    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument();
  });

  it('sends only API-contract fields in POST body — no changedBy, employeeId, oldAmount, createdAt', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          id: 'sal-new',
          employeeId: 'emp-1',
          amount: 100000,
          currencyCode: 'GBP',
          effectiveDate: '2026-01-15',
          payFrequency: 'annual',
          grade: 'G7',
          band: 'Lead',
          reason: 'Promotion',
          notes: null,
          changedBy: { id: 'u-1', email: 'hr@acme.com' },
          createdAt: '2026-01-15T10:00:00Z',
        },
      },
    });
    // Stub invalidation queries
    vi.mocked(api.get).mockResolvedValue({ data: { data: [], meta: {} } });

    render(wrap(<AddSalaryModal {...defaultProps} />));

    await userEvent.type(screen.getByLabelText(/amount/i), '100000');
    await userEvent.type(screen.getByLabelText(/currency/i), 'GBP');
    await userEvent.type(screen.getByLabelText(/grade/i), 'G7');
    await userEvent.type(screen.getByLabelText(/band/i), 'Lead');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Promotion');

    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    const [url, body] = vi.mocked(api.post).mock.calls[0];
    // URL must contain employeeId in the path, not in the body
    expect(url).toBe('/employees/emp-1/salary');

    // Only API-contract fields in the body
    expect(body).toHaveProperty('amount', 100000);
    expect(body).toHaveProperty('currencyCode', 'GBP');
    expect(body).toHaveProperty('payFrequency', 'annual');
    expect(body).toHaveProperty('reason', 'Promotion');

    // Forbidden fields must NEVER appear in the request body
    expect(body).not.toHaveProperty('changedBy');
    expect(body).not.toHaveProperty('employeeId');
    expect(body).not.toHaveProperty('oldAmount');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('id');
  });

  it('shows success banner on resolved mutation', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: 'sal-new' } } });
    vi.mocked(api.get).mockResolvedValue({ data: { data: [], meta: {} } });

    render(wrap(<AddSalaryModal {...defaultProps} />));

    await userEvent.type(screen.getByLabelText(/amount/i), '95000');
    await userEvent.type(screen.getByLabelText(/currency/i), 'USD');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Annual review');

    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));

    expect(await screen.findByText(/compensation change recorded/i)).toBeInTheDocument();
  });

  it('shows error banner on rejected mutation and keeps modal open', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'));

    render(wrap(<AddSalaryModal {...defaultProps} />));

    await userEvent.type(screen.getByLabelText(/amount/i), '95000');
    await userEvent.type(screen.getByLabelText(/currency/i), 'USD');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Annual review');

    fireEvent.click(screen.getByRole('button', { name: /record compensation change/i }));

    expect(await screen.findByText(/failed to record salary change/i)).toBeInTheDocument();
    // Modal stays open — form is still visible
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });
});
