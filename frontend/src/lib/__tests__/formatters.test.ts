import { describe, it, expect } from 'vitest';
import { formatUsd, formatNumber, formatPercent } from '../formatters';

describe('formatters utility', () => {
  describe('formatUsd', () => {
    it('formats integer USD amount with currency symbol and commas', () => {
      expect(formatUsd(85000)).toBe('$85,000');
      expect(formatUsd(850000000)).toBe('$850,000,000');
    });

    it('supports fraction digits when specified', () => {
      expect(formatUsd(1234.56, { maximumFractionDigits: 2 })).toBe('$1,234.56');
    });
  });

  describe('formatNumber', () => {
    it('formats number with commas', () => {
      expect(formatNumber(10000)).toBe('10,000');
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercent', () => {
    it('calculates and formats percentage correctly', () => {
      expect(formatPercent(2500, 10000)).toBe('25.0%');
      expect(formatPercent(1, 3, 2)).toBe('33.33%');
    });

    it('handles total <= 0 safely', () => {
      expect(formatPercent(10, 0)).toBe('0%');
    });
  });
});
