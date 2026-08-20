import * as React from 'react';
import { Lock, AlertCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSalaryHistory } from '../../hooks/useSalaryHistory';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface SalaryHistoryTableProps {
  employeeId: string;
}

/** Format a numeric amount using the record's own currencyCode — never hardcoded. */
const formatAmount = (amount: number, currencyCode: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if the currency code is unrecognised by the runtime
    return `${amount.toLocaleString()} ${currencyCode}`;
  }
};

const formatDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return dateStr;
};

const formatDateTime = (isoStr: string): string =>
  new Date(isoStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const SalaryHistoryTable: React.FC<SalaryHistoryTableProps> = ({ employeeId }) => {
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const { data, isLoading, isError, error, isFetching } = useSalaryHistory(
    employeeId,
    page,
    pageSize,
  );

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <Card className="border-border bg-card text-left">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <span>Compensation History</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-normal">
            Read-only — immutable audit record
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-border animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4 space-y-2">
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-5 w-1/2 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-center space-x-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load salary history</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center text-muted-foreground">
            <Lock className="h-8 w-8 text-muted-foreground/60" />
            <p className="font-semibold text-sm">No salary history on record</p>
            <p className="text-xs max-w-xs">
              Compensation records will appear here once a salary is assigned to this employee.
            </p>
          </div>
        )}

        {/* History rows — no edit/delete actions */}
        {!isLoading && !isError && entries.length > 0 && (
          <div className={`divide-y divide-border ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 space-y-2 text-left">
                {/* Top row: date + change direction */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Effective date */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-mono border border-border">
                    {formatDate(entry.effectiveDate)}
                  </span>

                  {/* old → new amount (using the record's currencyCode, never hardcoded) */}
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="text-muted-foreground">
                      {entry.oldAmount !== null
                        ? formatAmount(entry.oldAmount, entry.currencyCode)
                        : 'Initial'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatAmount(entry.newAmount, entry.currencyCode)}
                    </span>
                  </div>

                  {/* Frequency badge */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-medium capitalize">
                    {entry.payFrequency}
                  </span>

                  {/* Grade / Band chips */}
                  {entry.grade && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono border border-border">
                      {entry.grade}
                    </span>
                  )}
                  {entry.band && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground text-xs border border-border">
                      {entry.band}
                    </span>
                  )}
                </div>

                {/* Reason */}
                <p className="text-sm text-foreground">{entry.reason}</p>

                {/* Notes (if present) */}
                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">"{entry.notes}"</p>
                )}

                {/* Footer: changed-by + timestamp */}
                <p className="text-xs text-slate-500">
                  Recorded by{' '}
                  <span className="text-slate-400 font-medium">{entry.changedBy.email}</span>
                  {' · '}
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {meta?.page} of {totalPages} · {meta?.total} records
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="h-8 w-8 p-0"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isFetching}
                className="h-8 w-8 p-0"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
