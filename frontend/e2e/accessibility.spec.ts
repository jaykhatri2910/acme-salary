import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('QA-5: Automated Accessibility Audit (Axe-core)', () => {
  test('login page has zero critical accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical',
    );

    expect(criticalViolations).toEqual([]);
  });

  test('authenticated pages (Dashboard, Employees, Detail) have zero critical violations', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input#email', 'admin@acme.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // 1. Dashboard Scan
    await expect(page.locator('h1')).toHaveText('Executive Salary Analytics', { timeout: 10000 });
    const dashScan = await new AxeBuilder({ page }).analyze();
    const dashCritical = dashScan.violations.filter((v) => v.impact === 'critical');
    expect(dashCritical).toEqual([]);

    // 2. Employees Directory Scan
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page.locator('h1')).toHaveText('Employees Directory');
    const employeeRow = page.locator('tbody tr[role="button"]').first();
    await expect(employeeRow).toBeVisible({ timeout: 10000 });

    const empScan = await new AxeBuilder({ page }).analyze();
    const empCritical = empScan.violations.filter((v) => v.impact === 'critical');
    expect(empCritical).toEqual([]);

    // 3. Employee Detail Scan
    await employeeRow.click();
    await expect(page.getByText('Employee Profile')).toBeVisible();
    const detailScan = await new AxeBuilder({ page }).analyze();
    const detailCritical = detailScan.violations.filter((v) => v.impact === 'critical');
    expect(detailCritical).toEqual([]);
  });
});
