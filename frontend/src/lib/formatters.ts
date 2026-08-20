/**
 * Centralized formatting utilities for numbers and USD currency amounts.
 */

/**
 * Format a number as USD currency (e.g. $85,000 or $850,000,000).
 */
export const formatUsd = (
  amount: number,
  options: {
    maximumFractionDigits?: number;
    notation?: 'standard' | 'compact';
  } = {},
): string => {
  const { maximumFractionDigits = 0, notation = 'standard' } = options;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits,
      notation,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
};

/**
 * Format an integer/number with thousands separators (e.g. 10,000).
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format a proportion as a percentage string (e.g. 25.0%).
 */
export const formatPercent = (
  value: number,
  total: number,
  fractionDigits: number = 1,
): string => {
  if (total <= 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(fractionDigits)}%`;
};
