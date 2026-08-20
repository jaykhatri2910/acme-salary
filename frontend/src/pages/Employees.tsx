import * as React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../hooks/useDepartments';
import { useCountries } from '../hooks/useCountries';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Inbox, AlertCircle } from 'lucide-react';

export const Employees: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse URL search parameters with default values
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || '';
  const country = searchParams.get('country') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  // Local state for the search input to support debouncing
  const [searchInput, setSearchInput] = React.useState(search);

  // Debounce the search input by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== searchInput) {
        setSearchParams((prev) => {
          if (searchInput.trim()) {
            prev.set('search', searchInput.trim());
          } else {
            prev.delete('search');
          }
          prev.set('page', '1'); // Reset to page 1 on search change
          return prev;
        });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, search, setSearchParams]);

  // Fetch data
  const { data, isLoading, isError, error } = useEmployees({
    page,
    pageSize,
    search,
    department,
    country,
    status,
    sortBy,
    sortOrder,
  });

  const { data: departments = [] } = useDepartments();
  const { data: countries = [] } = useCountries();

  const handleFilterChange = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1'); // Reset to page 1 on filter changes
      return prev;
    });
  };

  const handleSortChange = (field: string) => {
    setSearchParams((prev) => {
      const currentSort = prev.get('sortBy') || 'name';
      const currentOrder = prev.get('sortOrder') || 'asc';

      if (currentSort === field) {
        prev.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc');
      } else {
        prev.set('sortBy', field);
        prev.set('sortOrder', 'asc');
      }
      prev.set('page', '1'); // Reset to page 1 on sort change
      return prev;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (data && newPage > data.meta.totalPages)) return;
    setSearchParams((prev) => {
      prev.set('page', String(newPage));
      return prev;
    });
  };

  // Helper to format currency
  const formatSalary = (salary: { amount: number; currencyCode: string; payFrequency: string } | null) => {
    if (!salary) return 'No salary record';
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currencyCode,
      maximumFractionDigits: 0,
    }).format(salary.amount);

    return `${amountFormatted} (${salary.currencyCode}) / ${salary.payFrequency}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-left m-0">Employees Directory</h1>
          <p className="text-sm text-muted-foreground text-left mt-1">
            Manage your workforce database, search profiles, and inspect salaries.
          </p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                key={search}
                placeholder="Search name or ID..."
                className="pl-9 h-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Department Filter */}
            <Select
              aria-label="Filter by department"
              value={department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>

            {/* Country Filter */}
            <Select
              aria-label="Filter by country"
              value={country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Status Filter */}
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            {/* Page Size Filter */}
            <Select
              aria-label="Items per page"
              value={String(pageSize)}
              onChange={(e) => handleFilterChange('pageSize', e.target.value)}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-900/50">
                <th className="p-4 text-sm font-semibold text-muted-foreground">ID</th>
                <th
                  onClick={() => handleSortChange('name')}
                  className="p-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('department')}
                  className="p-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Department</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('country')}
                  className="p-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Country</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th
                  onClick={() => handleSortChange('salary')}
                  className="p-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Current Salary</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-destructive">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="h-8 w-8" />
                      <span className="font-medium">Failed to load directory</span>
                      <span className="text-xs text-muted-foreground">
                        {error instanceof Error ? error.message : 'An error occurred'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : isLoading && !data ? (
                // Initial Loading skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-border animate-pulse">
                    <td className="p-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                    <td className="p-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="p-4"><div className="h-5 w-12 bg-slate-800 rounded-full" /></td>
                    <td className="p-4"><div className="h-4 w-40 bg-slate-800 rounded" /></td>
                  </tr>
                ))
              ) : data && data.data.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="h-10 w-10 text-slate-700" />
                      <span className="font-semibold text-sm">No employees found</span>
                      <span className="text-xs">Try adjusting your filters or search terms.</span>
                    </div>
                  </td>
                </tr>
              ) : data ? (
                // Success Rows
                data.data.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/employees/${emp.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${emp.fullName}`}
                    className="border-b border-border hover:bg-slate-900/50 cursor-pointer transition-colors outline-none focus:bg-slate-900/80"
                  >
                    <td className="p-4 text-sm font-medium font-mono text-slate-400">
                      {emp.employeeNo}
                    </td>
                    <td className="p-4 text-sm font-semibold text-foreground">
                      {emp.fullName}
                    </td>
                    <td className="p-4 text-sm text-slate-300">
                      {emp.department.name}
                    </td>
                    <td className="p-4 text-sm text-slate-300">
                      {emp.country.name}
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          emp.employmentStatus === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-200">
                      {formatSalary(emp.currentSalary)}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {data && data.meta.totalPages > 0 ? (
          <div className="flex flex-col space-y-4 p-4 border-t border-border sm:flex-row sm:items-center sm:justify-between sm:space-y-0 bg-slate-900/30">
            <span className="text-sm text-muted-foreground text-left">
              Showing page <span className="font-semibold text-foreground">{data.meta.page}</span> of{' '}
              <span className="font-semibold text-foreground">{data.meta.totalPages}</span> (
              <span className="font-semibold text-foreground">{data.meta.total}</span> total records)
            </span>

            <div className="flex items-center justify-end space-x-2">
              <button
                disabled={data.meta.page <= 1}
                onClick={() => handlePageChange(data.meta.page - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Pagination Page Buttons */}
              {Array.from({ length: Math.min(5, data.meta.totalPages) }).map((_, idx) => {
                // Render sliding window of pages
                let targetPage = data.meta.page - 2 + idx;
                if (data.meta.page <= 2) targetPage = idx + 1;
                else if (data.meta.page >= data.meta.totalPages - 1) {
                  targetPage = data.meta.totalPages - 4 + idx;
                }
                if (targetPage < 1 || targetPage > data.meta.totalPages) return null;

                return (
                  <button
                    key={targetPage}
                    onClick={() => handlePageChange(targetPage)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                      data.meta.page === targetPage
                        ? 'bg-slate-800 text-foreground border-slate-700'
                        : 'border-input bg-card hover:bg-accent'
                    }`}
                  >
                    {targetPage}
                  </button>
                );
              })}

              <button
                disabled={data.meta.page >= data.meta.totalPages}
                onClick={() => handlePageChange(data.meta.page + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};
