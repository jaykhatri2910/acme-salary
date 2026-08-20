import * as React from 'react';
import { Globe, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { CountryBreakdown } from '../../hooks/useAnalytics';
import { formatUsd, formatNumber, formatPercent } from '../../lib/formatters';

interface CountryBreakdownTableProps {
  countries?: CountryBreakdown[];
  totalHeadcount?: number;
  isLoading?: boolean;
}

export const CountryBreakdownTable: React.FC<CountryBreakdownTableProps> = ({
  countries = [],
  totalHeadcount = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="border-border bg-card text-left" data-testid="country-breakdown-skeleton">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card text-left overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Globe className="h-5 w-5 text-emerald-400" />
            <span>Regional Compensation Breakdown</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-normal">
            {countries.length} {countries.length === 1 ? 'region' : 'regions'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {countries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 text-slate-700" />
            <p className="font-semibold text-sm">No regional data available</p>
            <p className="text-xs max-w-xs">
              Country compensation statistics will appear here when records match your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-900/50">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Country
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Headcount (% Global)
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Payroll (USD)
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Average Salary
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Median Salary
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Salary Range (Min – Max)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {countries.map((c) => {
                  const headcount = c.headcount ?? 0;
                  const totalPayroll = c.totalPayrollUsd ?? 0;
                  const avgSalary = c.averageSalaryUsd ?? 0;
                  const medianSalary = c.medianSalaryUsd ?? 0;
                  const minSalary = c.minSalaryUsd ?? 0;
                  const maxSalary = c.maxSalaryUsd ?? 0;

                  return (
                    <tr
                      key={c.countryCode || c.country}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="p-4 text-sm font-semibold text-foreground">
                        <div className="flex items-center space-x-2">
                          <span>{c.country}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {c.countryCode}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        <span className="font-semibold text-foreground font-mono">
                          {formatNumber(headcount)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          ({formatPercent(headcount, totalHeadcount)})
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-200 font-semibold font-mono">
                        {formatUsd(totalPayroll)}
                      </td>
                      <td className="p-4 text-sm text-emerald-400 font-semibold font-mono">
                        {formatUsd(avgSalary)}
                      </td>
                      <td className="p-4 text-sm text-violet-300 font-semibold font-mono">
                        {formatUsd(medianSalary)}
                      </td>
                      <td className="p-4 text-sm text-slate-400 font-mono text-xs">
                        {formatUsd(minSalary)} – {formatUsd(maxSalary)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
