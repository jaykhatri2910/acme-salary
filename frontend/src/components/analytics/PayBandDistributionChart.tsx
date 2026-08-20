import * as React from 'react';
import { Layers, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { PayBandDistribution } from '../../hooks/useAnalytics';
import { formatNumber, formatPercent } from '../../lib/formatters';

interface PayBandDistributionChartProps {
  distribution?: PayBandDistribution[];
  totalHeadcount?: number;
  isLoading?: boolean;
}

export const PayBandDistributionChart: React.FC<PayBandDistributionChartProps> = ({
  distribution = [],
  totalHeadcount = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="border-border bg-card text-left" data-testid="pay-band-skeleton">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-4 w-14 bg-slate-800 rounded" />
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Calculate maximum headcount for scaling bars
  const maxHeadcount = Math.max(...distribution.map((d) => d.headcount || 0), 1);

  // Gradient accents by band tier for visual distinction
  const getBandGradient = (bandName: string): string => {
    switch (bandName.toLowerCase()) {
      case 'junior':
        return 'from-sky-500 to-cyan-500';
      case 'mid':
        return 'from-blue-500 to-indigo-500';
      case 'senior':
        return 'from-indigo-500 to-purple-500';
      case 'lead':
        return 'from-purple-500 to-pink-500';
      case 'unassigned':
        return 'from-slate-600 to-slate-500';
      default:
        return 'from-cyan-500 to-blue-500';
    }
  };

  return (
    <Card className="border-border bg-card text-left">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Layers className="h-5 w-5 text-cyan-400" />
            <span>Pay Band Distribution</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-normal">
            {distribution.length} {distribution.length === 1 ? 'tier' : 'tiers'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {distribution.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 text-slate-700" />
            <p className="font-semibold text-sm">No pay band data</p>
            <p className="text-xs max-w-xs">
              Band allocations will appear when employee data is available.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {distribution.map((item, idx) => {
              const bandLabel = item.band && item.band.trim().length > 0 ? item.band : 'Unassigned';
              const count = item.headcount ?? 0;
              const barWidth = Math.min(100, Math.max(3, (count / maxHeadcount) * 100));
              const percent = formatPercent(count, totalHeadcount);

              return (
                <div key={item.band ?? `unassigned-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-200">{bandLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        ({percent})
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono text-slate-300">
                      {formatNumber(count)}
                    </span>
                  </div>

                  {/* Proportional bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full bg-gradient-to-r ${getBandGradient(bandLabel)} rounded-full transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={maxHeadcount}
                      aria-label={`${bandLabel} headcount`}
                    />
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
