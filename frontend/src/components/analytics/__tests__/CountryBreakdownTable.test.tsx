import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountryBreakdownTable } from '../CountryBreakdownTable';
import type { CountryBreakdown } from '../../../hooks/useAnalytics';

const mockCountries: CountryBreakdown[] = [
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
  {
    country: 'India',
    countryCode: 'IN',
    headcount: 3000,
    totalPayrollUsd: 150000000,
    averageSalaryUsd: 50000,
    medianSalaryUsd: 48000,
    minSalaryUsd: 20000,
    maxSalaryUsd: 120000,
  },
];

describe('CountryBreakdownTable component', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<CountryBreakdownTable isLoading={true} />);
    expect(screen.getByTestId('country-breakdown-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when countries array is empty', () => {
    render(<CountryBreakdownTable countries={[]} totalHeadcount={0} />);
    expect(screen.getByText('No regional data available')).toBeInTheDocument();
  });

  it('renders country rows with code badges, headcounts, payroll, and averages', () => {
    render(
      <CountryBreakdownTable
        countries={mockCountries}
        totalHeadcount={10000}
      />,
    );

    // Country name and code badges
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('IN')).toBeInTheDocument();

    // Headcounts and percentages
    expect(screen.getByText('4,000')).toBeInTheDocument();
    expect(screen.getByText('(40.0%)')).toBeInTheDocument();
    expect(screen.getByText('3,000')).toBeInTheDocument();
    expect(screen.getByText('(30.0%)')).toBeInTheDocument();

    // Payroll & Salary metrics
    expect(screen.getByText('$400,000,000')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$95,000')).toBeInTheDocument();
    expect(screen.getByText('$40,000 – $250,000')).toBeInTheDocument();

    expect(screen.getByText('$150,000,000')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('$48,000')).toBeInTheDocument();
    expect(screen.getByText('$20,000 – $120,000')).toBeInTheDocument();
  });

  it('handles zero or missing values safely', () => {
    const zeroCountries: CountryBreakdown[] = [
      {
        country: 'Germany',
        countryCode: 'DE',
        headcount: 0,
        totalPayrollUsd: 0,
        averageSalaryUsd: 0,
        medianSalaryUsd: 0,
        minSalaryUsd: 0,
        maxSalaryUsd: 0,
      },
    ];

    render(
      <CountryBreakdownTable
        countries={zeroCountries}
        totalHeadcount={0}
      />,
    );

    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
    expect(screen.getAllByText('$0')).toHaveLength(3);
    expect(screen.getByText('$0 – $0')).toBeInTheDocument();
  });
});
