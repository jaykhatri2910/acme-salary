import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAddSalary } from '../../hooks/useAddSalary';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select } from '../ui/select';

// ---------------------------------------------------------------------------
// Effective-date validation: compare YYYY-MM-DD strings lexicographically
// to avoid timezone off-by-one errors (never convert to Date object).
// ---------------------------------------------------------------------------
const todayYMD = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addSalarySchema = z.object({
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than zero'),
  currencyCode: z
    .string()
    .min(1, 'Currency code is required')
    .length(3, 'Must be exactly 3 characters (e.g. USD, GBP, CAD)'),
  payFrequency: z.enum(['monthly', 'annual'], {
    error: "Pay frequency must be 'monthly' or 'annual'",
  }),
  grade: z.string().optional(),
  band: z.string().optional(),
  // Effective date: YYYY-MM-DD string compared lexicographically — no Date conversion
  effectiveDate: z
    .string()
    .min(1, 'Effective date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
    .refine(
      (v) => v <= todayYMD(),
      'Effective date cannot be in the future',
    ),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

type AddSalaryFields = z.infer<typeof addSalarySchema>;

interface AddSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export const AddSalaryModal: React.FC<AddSalaryModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const { mutate, isPending, isSuccess, isError, reset } = useAddSalary(employeeId);
  const [apiFieldErrors, setApiFieldErrors] = React.useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset: resetForm,
  } = useForm<AddSalaryFields>({
    resolver: zodResolver(addSalarySchema),
    defaultValues: {
      amount: undefined,
      currencyCode: '',
      payFrequency: 'annual',
      grade: '',
      band: '',
      effectiveDate: todayYMD(),
      reason: '',
      notes: '',
    },
  });


  // currencyCode is uppercased in the mutation payload — no live watch needed

  const handleClose = () => {
    if (isDirty && !isSuccess) {
      if (!window.confirm('Discard unsaved changes?')) return;
    }
    resetForm();
    reset();
    setApiFieldErrors({});
    onClose();
  };

  // Auto-close on success after 1.5s
  React.useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      handleClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps



  const onSubmit = (data: AddSalaryFields) => {
    setApiFieldErrors({});
    // POST payload — only the 8 API-contract fields, nothing else
    mutate(
      {
        amount: data.amount,
        currencyCode: data.currencyCode,
        effectiveDate: data.effectiveDate,
        payFrequency: data.payFrequency,
        reason: data.reason,
        ...(data.grade ? { grade: data.grade } : {}),
        ...(data.band ? { band: data.band } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
      {
        onError: (err: unknown) => {
          // Map API field-level validation errors into the form
          const axiosErr = err as { response?: { data?: { details?: Record<string, string[]> } } };
          const details = axiosErr?.response?.data?.details;
          if (details && typeof details === 'object') {
            const mapped: Record<string, string> = {};
            for (const [field, msgs] of Object.entries(details)) {
              mapped[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
            }
            setApiFieldErrors(mapped);
          }
        },
      },
    );
  };

  const fieldError = (name: keyof AddSalaryFields): string | undefined =>
    errors[name]?.message ?? apiFieldErrors[name];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Compensation Change"
      disableBackdropClose={isDirty && !isSuccess}
    >
      {/* Success banner */}
      {isSuccess && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-4 mb-4">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">Compensation change recorded</p>
            <p className="text-xs text-emerald-400/70">
              The salary record has been saved. This window will close shortly.
            </p>
          </div>
        </div>
      )}

      {/* Immutability warning — always shown before the form */}
      {!isSuccess && (
        <>
          <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/25 p-4 mb-5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              This will create a <strong>permanent, immutable</strong> salary record for{' '}
              <strong>{employeeName}</strong>. Existing records cannot be edited or deleted.
              This action cannot be undone.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Row 1: Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="95000"
                  {...register('amount', { valueAsNumber: true })}
                />
                {fieldError('amount') && (
                  <p className="text-xs text-destructive">{fieldError('amount')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currencyCode">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currencyCode"
                  type="text"
                  maxLength={3}
                  placeholder="USD"
                  className="uppercase"
                  {...register('currencyCode')}
                />
                {fieldError('currencyCode') && (
                  <p className="text-xs text-destructive">{fieldError('currencyCode')}</p>
                )}
              </div>
            </div>

            {/* Row 2: Pay Frequency + Effective Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payFrequency">
                  Pay Frequency <span className="text-destructive">*</span>
                </Label>
                <Select id="payFrequency" {...register('payFrequency')}>
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                </Select>
                {fieldError('payFrequency') && (
                  <p className="text-xs text-destructive">{fieldError('payFrequency')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="effectiveDate">
                  Effective Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  max={todayYMD()}
                  {...register('effectiveDate')}
                />
                {fieldError('effectiveDate') && (
                  <p className="text-xs text-destructive">{fieldError('effectiveDate')}</p>
                )}
              </div>
            </div>

            {/* Row 3: Grade + Band (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" type="text" placeholder="G6" {...register('grade')} />
                {fieldError('grade') && (
                  <p className="text-xs text-destructive">{fieldError('grade')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="band">Band</Label>
                <Input id="band" type="text" placeholder="Senior" {...register('band')} />
                {fieldError('band') && (
                  <p className="text-xs text-destructive">{fieldError('band')}</p>
                )}
              </div>
            </div>

            {/* Reason (required) */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reason"
                type="text"
                placeholder="e.g. Annual review, Promotion, Market adjustment"
                {...register('reason')}
              />
              {fieldError('reason') && (
                <p className="text-xs text-destructive">{fieldError('reason')}</p>
              )}
            </div>

            {/* Notes (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional context (optional)"
                {...register('notes')}
              />
            </div>

            {/* Generic API error */}
            {isError && Object.keys(apiFieldErrors).length === 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Failed to record salary change. Please check your inputs and try again.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording…
                  </>
                ) : (
                  'Record Compensation Change'
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};
