import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalyticsSummaryCards } from '../analytics/AnalyticsSummaryCards';
import type { AnalyticsSummary } from '../../hooks/useAnalytics';

const mockSummary: AnalyticsSummary = {
  headcount: 10000,
  totalPayrollUsd: 850000000,
  averageSalaryUsd: 85000,
  medianSalaryUsd: 82000,
  minSalaryUsd: 30000,
  maxSalaryUsd: 250000,
  byDepartment: [],
  byCountry: [],
  payBandDistribution: [],
  currentExchangeRates: [],
};

describe('AnalyticsSummaryCards component', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<AnalyticsSummaryCards isLoading={true} />);
    expect(screen.getByTestId('summary-cards-skeleton')).toBeInTheDocument();
  });

  it('renders all 5 metric cards with formatted values', () => {
    render(<AnalyticsSummaryCards summary={mockSummary} />);

    // Headcount
    expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();

    // Total Payroll
    expect(screen.getByText('Total Annual Payroll')).toBeInTheDocument();
    expect(screen.getByText('$850,000,000')).toBeInTheDocument();

    // Average Salary
    expect(screen.getByText('Average Salary')).toBeInTheDocument();
    expect(screen.getByText('$85,000')).toBeInTheDocument();

    // Median Salary
    expect(screen.getByText('Median Salary')).toBeInTheDocument();
    expect(screen.getByText('$82,000')).toBeInTheDocument();

    // Salary Range
    expect(screen.getByText('Salary Range (Min – Max)')).toBeInTheDocument();
    expect(screen.getByText('$30,000 – $250,000')).toBeInTheDocument();
  });

  it('handles missing/undefined summary data safely', () => {
    render(<AnalyticsSummaryCards summary={undefined} />);

    expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    expect(screen.getByText('Total Annual Payroll')).toBeInTheDocument();
    expect(screen.getAllByText('$0')).toHaveLength(3);

    expect(screen.getByText('$0 – $0')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroSummary: AnalyticsSummary = {
      headcount: 0,
      totalPayrollUsd: 0,
      averageSalaryUsd: 0,
      medianSalaryUsd: 0,
      minSalaryUsd: 0,
      maxSalaryUsd: 0,
      byDepartment: [],
      byCountry: [],
      payBandDistribution: [],
      currentExchangeRates: [],
    };

    render(<AnalyticsSummaryCards summary={zeroSummary} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('$0')).toHaveLength(3); // total, avg, median
    expect(screen.getByText('$0 – $0')).toBeInTheDocument();
  });
});
