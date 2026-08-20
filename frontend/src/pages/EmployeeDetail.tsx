import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Briefcase, DollarSign, Calendar,
  Mail, FileText, AlertCircle, Plus,
} from 'lucide-react';
import { useEmployee } from '../hooks/useEmployee';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { SalaryHistoryTable } from '../components/salary/SalaryHistoryTable';
import { AddSalaryModal } from '../components/salary/AddSalaryModal';

export const EmployeeDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useEmployee(id);

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Format currency using the record's actual currencyCode — never hardcoded
  const formatCurrency = (amount: number, currencyCode: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currencyCode}`;
    }
  };

  // Format dates (YYYY-MM-DD strings parsed without timezone conversion)
  const formatDate = (dateStr: string) => {
    // Parse as local date to avoid off-by-one from UTC conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/employees')} className="flex items-center space-x-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to directory</span>
        </Button>
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="flex items-center space-x-3 p-6 text-destructive">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Failed to load profile</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const employee = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={() => navigate('/employees')}
          className="flex items-center space-x-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to directory</span>
        </Button>
      </div>

      {isLoading ? (
        // Detailed Profile Loading Skeletons
        <div className="grid gap-6 md:grid-cols-2 animate-pulse">
          <Card className="border-border bg-card">
            <div className="p-6 space-y-4">
              <div className="h-6 w-1/3 bg-slate-800 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-slate-800 rounded" />
                <div className="h-4 w-1/2 bg-slate-800 rounded" />
              </div>
            </div>
          </Card>
          <Card className="border-border bg-card">
            <div className="p-6 space-y-4">
              <div className="h-6 w-1/3 bg-slate-800 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-slate-800 rounded" />
                <div className="h-4 w-1/2 bg-slate-800 rounded" />
              </div>
            </div>
          </Card>
        </div>
      ) : employee ? (
        <>
          {/* ── Profile + Current Compensation ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee Information Card — unchanged */}
            <Card className="border-border bg-card text-left">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span>Employee Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{employee.fullName}</h2>
                    <p className="text-sm font-mono text-slate-400 mt-0.5">{employee.employeeNo}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      employee.employmentStatus === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                    }`}
                  >
                    {employee.employmentStatus}
                  </span>
                </div>

                <div className="border-t border-border pt-4 grid gap-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-400 w-24">Email:</span>
                    <span className="text-slate-200">{employee.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-400 w-24">Department:</span>
                    <span className="text-slate-200 font-semibold">{employee.department.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-400 w-24">Country:</span>
                    <span className="text-slate-200 font-semibold">
                      {employee.country.name} ({employee.country.code})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Salary Card — adds "Record Compensation Change" button to header */}
            <Card className="border-border bg-card text-left">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>Current Compensation</span>
                  </CardTitle>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 h-8 text-xs px-3"
                    aria-label="Record compensation change"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {employee.currentSalary ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Current Salary
                      </span>
                      <h2 className="text-3xl font-extrabold text-slate-100 mt-1">
                        {formatCurrency(employee.currentSalary.amount, employee.currentSalary.currencyCode)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          / {employee.currentSalary.payFrequency}
                        </span>
                      </h2>
                    </div>

                    <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Grade</span>
                        <span className="text-slate-200 font-semibold font-mono">
                          {employee.currentSalary.grade || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Pay Band</span>
                        <span className="text-slate-200 font-semibold font-mono">
                          {employee.currentSalary.band || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>Effective Date</span>
                        </span>
                        <span className="text-slate-200 font-semibold mt-0.5 block">
                          {formatDate(employee.currentSalary.effectiveDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 space-y-2 text-center text-muted-foreground h-full min-h-[150px]">
                    <AlertCircle className="h-8 w-8 text-slate-700" />
                    <span className="font-semibold text-sm">No active salary record</span>
                    <p className="text-xs max-w-xs">
                      This employee does not have any salary audit records assigned.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Compensation History ── */}
          <SalaryHistoryTable employeeId={id} />

          {/* ── Add Salary Modal ── */}
          <AddSalaryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            employeeId={id}
            employeeName={employee.fullName}
          />
        </>
      ) : null}
    </div>
  );
};
