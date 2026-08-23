import * as React from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import type { AnalyticsSummary } from "../../hooks/useAnalytics";
import { formatUsd, formatNumber } from "../../lib/formatters";

interface AnalyticsSummaryCardsProps {
  summary?: AnalyticsSummary;
  isLoading?: boolean;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        data-testid="summary-cards-skeleton"
      >
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border-border bg-card">
            <CardContent className="p-5 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-muted rounded" />
                <div className="h-7 w-7 bg-muted rounded-md" />
              </div>
              <div className="h-7 w-32 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const headcount = summary?.headcount ?? 0;
  const totalPayroll = summary?.totalPayrollUsd ?? 0;
  const avgSalary = summary?.averageSalaryUsd ?? 0;
  const medianSalary = summary?.medianSalaryUsd ?? 0;
  const minSalary = summary?.minSalaryUsd ?? 0;
  const maxSalary = summary?.maxSalaryUsd ?? 0;

  const cards = [
    {
      id: "headcount",
      title: "Total Headcount",
      value: formatNumber(headcount),
      subtitle: "Active workforce on record",
      icon: Users,
      iconColor: "text-cyan-500 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: "total-payroll",
      title: "Total Annual Payroll",
      value: formatUsd(totalPayroll),
      subtitle: "USD normalized aggregate",
      icon: DollarSign,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "average-salary",
      title: "Average Salary",
      value: formatUsd(avgSalary),
      subtitle: "Mean compensation",
      icon: TrendingUp,
      iconColor: "text-blue-500 dark:text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "median-salary",
      title: "Median Salary",
      value: formatUsd(medianSalary),
      subtitle: "50th percentile benchmark",
      icon: BarChart3,
      iconColor: "text-violet-500 dark:text-violet-400",
      iconBg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      id: "salary-range",
      title: "Salary Range (Min – Max)",
      value: `${formatUsd(minSalary)} – ${formatUsd(maxSalary)}`,
      subtitle: "Compensation spread",
      icon: ArrowLeftRight,
      iconColor: "text-amber-500 dark:text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      data-testid="summary-cards-container"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className="border-border bg-card text-left transition-all hover:shadow-sm"
          >
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`h-7 w-7 rounded-md border flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Exchange Rates Display */}
      {summary?.currentExchangeRates && summary.currentExchangeRates.length > 0 && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-5 text-xs text-muted-foreground text-right mt-2">
          <span className="font-semibold">Exchange Rates:</span>{' '}
          {summary.currentExchangeRates.map((rate, idx) => (
            <span key={rate.currency}>
              1 USD = {Number((1 / rate.rateToUsd).toFixed(2))} {rate.currency}
              {idx < summary.currentExchangeRates.length - 1 ? ' | ' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
