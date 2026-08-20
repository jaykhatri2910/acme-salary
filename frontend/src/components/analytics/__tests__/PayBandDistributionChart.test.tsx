import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PayBandDistributionChart } from '../PayBandDistributionChart';
import type { PayBandDistribution } from '../../../hooks/useAnalytics';

const mockDistribution: PayBandDistribution[] = [
  { band: 'Junior', headcount: 2500 },
  { band: 'Mid', headcount: 4000 },
  { band: 'Senior', headcount: 3000 },
  { band: 'Lead', headcount: 500 },
];

describe('PayBandDistributionChart component', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<PayBandDistributionChart isLoading={true} />);
    expect(screen.getByTestId('pay-band-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when distribution array is empty', () => {
    render(<PayBandDistributionChart distribution={[]} totalHeadcount={0} />);
    expect(screen.getByText('No pay band data')).toBeInTheDocument();
  });

  it('renders band tiers, headcounts, and proportions', () => {
    render(
      <PayBandDistributionChart
        distribution={mockDistribution}
        totalHeadcount={10000}
      />,
    );

    // Band names
    expect(screen.getByText('Junior')).toBeInTheDocument();
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('Lead')).toBeInTheDocument();

    // Percentages
    expect(screen.getByText('(25.0%)')).toBeInTheDocument();
    expect(screen.getByText('(40.0%)')).toBeInTheDocument();
    expect(screen.getByText('(30.0%)')).toBeInTheDocument();
    expect(screen.getByText('(5.0%)')).toBeInTheDocument();

    // Headcounts
    expect(screen.getByText('2,500')).toBeInTheDocument();
    expect(screen.getByText('4,000')).toBeInTheDocument();
    expect(screen.getByText('3,000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders null/undefined band name as "Unassigned"', () => {
    const unassignedDistribution: PayBandDistribution[] = [
      { band: null, headcount: 120 },
      { band: '', headcount: 80 },
    ];

    render(
      <PayBandDistributionChart
        distribution={unassignedDistribution}
        totalHeadcount={200}
      />,
    );

    expect(screen.getAllByText('Unassigned')).toHaveLength(2);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });
});
