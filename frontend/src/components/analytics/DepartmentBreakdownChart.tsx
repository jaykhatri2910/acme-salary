import * as React from 'react';
import { Building2, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { DepartmentBreakdown } from '../../hooks/useAnalytics';
import { formatUsd, formatNumber, formatPercent } from '../../lib/formatters';

interface DepartmentBreakdownChartProps {
  departments?: DepartmentBreakdown[];
  totalHeadcount?: number;
  isLoading?: boolean;
}

export const DepartmentBreakdownChart: React.FC<DepartmentBreakdownChartProps> = ({
  departments = [],
  totalHeadcount = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="border-border bg-card text-left" data-testid="department-breakdown-skeleton">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded" />
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Max average salary to scale visual bars proportionally
  const maxAvgSalary = Math.max(...departments.map((d) => d.averageSalaryUsd || 0), 1);

  return (
    <Card className="border-border bg-card text-left">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <span>Department Breakdown</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-normal">
            {departments.length} {departments.length === 1 ? 'department' : 'departments'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 text-slate-700" />
            <p className="font-semibold text-sm">No department data available</p>
            <p className="text-xs max-w-xs">
              Department metrics will appear here when employees match the selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {departments.map((dept) => {
              const headcount = dept.headcount ?? 0;
              const avgSalary = dept.averageSalaryUsd ?? 0;
              const totalPayroll = dept.totalPayrollUsd ?? 0;
              const minSalary = dept.minSalaryUsd ?? 0;
              const maxSalary = dept.maxSalaryUsd ?? 0;
              const percentOfTotal = totalHeadcount > 0 ? (headcount / totalHeadcount) * 100 : 0;
              const barWidth = Math.min(100, Math.max(4, (avgSalary / maxAvgSalary) * 100));

              return (
                <div key={dept.department} className="space-y-2 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100">{dept.department}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {formatNumber(headcount)} employees ({formatPercent(headcount, totalHeadcount)})
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span>
                        Payroll: <strong className="text-slate-200">{formatUsd(totalPayroll)}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Avg: <strong className="text-indigo-300 font-semibold">{formatUsd(avgSalary)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Proportional visual bar for average salary */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                      role="progressbar"
                      aria-valuenow={avgSalary}
                      aria-valuemin={0}
                      aria-valuemax={maxAvgSalary}
                      aria-label={`${dept.department} average salary`}
                    />
                  </div>

                  {/* Detail sub-row: range spread & percent of workforce */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Spread: {formatUsd(minSalary)} – {formatUsd(maxSalary)}
                    </span>
                    <span>
                      {percentOfTotal.toFixed(1)}% of workforce
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
