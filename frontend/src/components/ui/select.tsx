import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      options: optionsProp,
      children,
      value: controlledValue,
      defaultValue,
      onChange,
      disabled = false,
      placeholder = 'Select an option',
      id,
      name,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // 1. Extract options from children (<option> elements) if optionsProp is not provided
    const options = React.useMemo<SelectOption[]>(() => {
      if (optionsProp) return optionsProp;
      const parsed: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
          const val = childProps.value !== undefined ? String(childProps.value) : '';
          const lbl = childProps.children ?? val;
          parsed.push({
            value: val,
            label: lbl,
            disabled: childProps.disabled,
          });
        }
      });
      return parsed;
    }, [optionsProp, children]);

    // 2. Track internal selection for custom dropdown state
    const [internalValue, setInternalValue] = React.useState<string>(() => {
      if (controlledValue !== undefined) return String(controlledValue);
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value ?? '';
    });

    const currentValue = controlledValue !== undefined ? String(controlledValue) : internalValue;

    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const internalSelectRef = React.useRef<HTMLSelectElement | null>(null);

    // Sync external ref if provided
    React.useImperativeHandle(ref, () => internalSelectRef.current as HTMLSelectElement);

    // Close on click outside
    React.useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    // Selected option label
    const selectedOption = options.find((opt) => String(opt.value) === currentValue);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    // Handle selecting an option
    const handleSelectOption = (val: string) => {
      if (disabled) return;
      setInternalValue(val);
      setIsOpen(false);

      if (internalSelectRef.current) {
        internalSelectRef.current.value = val;
        // Dispatch synthetic & native change events for full compatibility
        const event = new Event('change', { bubbles: true });
        internalSelectRef.current.dispatchEvent(event);
      }

      if (onChange) {
        // Create synthetic change event for React onChange handler
        const syntheticEvent = {
          target: { value: val, name: name || id || '' },
          currentTarget: { value: val, name: name || id || '' },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className={`relative flex flex-col space-y-1 text-left ${className}`} ref={containerRef}>
        {label ? (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none"
          >
            {label}
          </label>
        ) : null}

        {/* Custom Dropdown Trigger */}
        <button
          type="button"
          id={id ? `${id}-trigger` : undefined}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
            isOpen ? 'ring-1 ring-ring border-ring' : ''
          }`}
        >
          <span className="truncate text-foreground font-normal">{displayLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </button>

        {/* Custom Dropdown Floating Popover */}
        {isOpen && (
          <div
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel || (typeof label === 'string' ? label : 'Options')}
            className="absolute top-full left-0 z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {options.map((opt, idx) => {
                const isSelected = String(opt.value) === currentValue;
                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected}
                    onClick={() => !opt.disabled && handleSelectOption(opt.value)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 text-sm rounded-md transition-colors cursor-pointer select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                        : isSelected
                        ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-primary ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hidden underlying native select for HTML Form, accessibility & test runner compatibility */}
        <select
          ref={internalSelectRef}
          id={id}
          name={name}
          value={currentValue}
          onChange={(e) => {
            setInternalValue(e.target.value);
            if (onChange) onChange(e);
          }}
          disabled={disabled}
          aria-label={ariaLabel}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only absolute pointer-events-none opacity-0 h-0 w-0"
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value} disabled={opt.disabled}>
              {typeof opt.label === 'string' ? opt.label : opt.value}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
