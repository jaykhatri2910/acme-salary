import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DepartmentBreakdownChart } from '../DepartmentBreakdownChart';
import type { DepartmentBreakdown } from '../../../hooks/useAnalytics';

const mockDepartments: DepartmentBreakdown[] = [
  {
    department: 'Engineering',
    headcount: 2500,
    totalPayrollUsd: 250000000,
    averageSalaryUsd: 100000,
    medianSalaryUsd: 97000,
    minSalaryUsd: 50000,
    maxSalaryUsd: 250000,
  },
  {
    department: 'Product',
    headcount: 1500,
    totalPayrollUsd: 135000000,
    averageSalaryUsd: 90000,
    medianSalaryUsd: 88000,
    minSalaryUsd: 45000,
    maxSalaryUsd: 200000,
  },
];

describe('DepartmentBreakdownChart component', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<DepartmentBreakdownChart isLoading={true} />);
    expect(screen.getByTestId('department-breakdown-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when departments array is empty', () => {
    render(<DepartmentBreakdownChart departments={[]} totalHeadcount={0} />);
    expect(screen.getByText('No department data available')).toBeInTheDocument();
  });

  it('renders department names, headcounts, percentages, and formatted salary figures', () => {
    render(
      <DepartmentBreakdownChart
        departments={mockDepartments}
        totalHeadcount={10000}
      />,
    );

    // Department names
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();

    // Headcount & workforce percentage
    expect(screen.getByText(/2,500 employees \(25\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/1,500 employees \(15\.0%\)/)).toBeInTheDocument();

    // Total payroll
    expect(screen.getByText('$250,000,000')).toBeInTheDocument();
    expect(screen.getByText('$135,000,000')).toBeInTheDocument();

    // Average salary
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$90,000')).toBeInTheDocument();

    // Salary spread
    expect(screen.getByText(/Spread: \$50,000 – \$250,000/)).toBeInTheDocument();
    expect(screen.getByText(/Spread: \$45,000 – \$200,000/)).toBeInTheDocument();
  });

  it('handles zero or missing values safely', () => {
    const zeroDepts: DepartmentBreakdown[] = [
      {
        department: 'Finance',
        headcount: 0,
        totalPayrollUsd: 0,
        averageSalaryUsd: 0,
        medianSalaryUsd: 0,
        minSalaryUsd: 0,
        maxSalaryUsd: 0,
      },
    ];

    render(
      <DepartmentBreakdownChart
        departments={zeroDepts}
        totalHeadcount={0}
      />,
    );

    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText(/0 employees \(0%\)/)).toBeInTheDocument();
    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(2);
  });
});
