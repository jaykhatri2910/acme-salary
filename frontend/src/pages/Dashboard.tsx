import * as React from 'react';
import { Download, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { useAnalytics, exportSalaryCsv } from '../hooks/useAnalytics';
import { useDepartments } from '../hooks/useDepartments';
import { useCountries } from '../hooks/useCountries';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AnalyticsSummaryCards } from '../components/analytics/AnalyticsSummaryCards';
import { DepartmentBreakdownChart } from '../components/analytics/DepartmentBreakdownChart';
import { PayBandDistributionChart } from '../components/analytics/PayBandDistributionChart';
import { CountryBreakdownTable } from '../components/analytics/CountryBreakdownTable';

export const Dashboard: React.FC = () => {
  const [department, setDepartment] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Fetch reference dropdown options
  const { data: departments = [] } = useDepartments();
  const { data: countries = [] } = useCountries();

  // Fetch analytics summary from backend
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalytics({
    department: department || undefined,
    country: country || undefined,
  });

  const summary = data?.data;
  const hasActiveFilters = Boolean(department || country);

  const handleResetFilters = () => {
    setDepartment('');
    setCountry('');
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportSalaryCsv({
        department: department || undefined,
        country: country || undefined,
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export CSV dataset');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header & Actions ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-left m-0">
            Executive Salary Analytics
          </h1>
          <p className="text-sm text-muted-foreground text-left mt-1">
            Real-time workforce compensation insights and departmental distribution
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2"
            aria-label="Export CSV"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Export Error Feedback ── */}
      {exportError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/25 p-4 text-destructive">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{exportError}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setExportError(null)}
            className="h-8 text-xs border-destructive/30 hover:bg-destructive/20 text-destructive"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Department Filter */}
            <div className="flex-1">
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Country Filter */}
            <div className="flex-1">
              <Select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Filter by country"
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 shrink-0 text-xs"
                aria-label="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Analytics Error State ── */}
      {isError ? (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 text-destructive">
            <div className="flex items-center space-x-3 text-left">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Failed to load salary analytics</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="border-destructive/30 hover:bg-destructive/20 text-destructive shrink-0"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={`space-y-8 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-80' : ''}`}>
          {/* 1. Overall Summary Statistics Cards */}
          <AnalyticsSummaryCards summary={summary} isLoading={isLoading} />

          {/* 2. Middle Grid: Department Breakdown (2 cols) & Pay Band Distribution (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DepartmentBreakdownChart
                departments={summary?.byDepartment}
                totalHeadcount={summary?.headcount}
                isLoading={isLoading}
              />
            </div>
            <div className="lg:col-span-1">
              <PayBandDistributionChart
                distribution={summary?.payBandDistribution}
                totalHeadcount={summary?.headcount}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 3. Regional / Country Breakdown Table */}
          <CountryBreakdownTable
            countries={summary?.byCountry}
            totalHeadcount={summary?.headcount}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};
