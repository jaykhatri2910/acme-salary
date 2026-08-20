import { test, expect } from '@playwright/test';

test.describe('QA-2: Executive Analytics & Filtered CSV Export Flow', () => {
  test('login -> view analytics -> filter -> export CSV', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.fill('input#email', 'admin@acme.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // 2. Wait for login completion and Dashboard header
    await expect(page.locator('h1')).toHaveText('Executive Salary Analytics', { timeout: 10000 });

    // 3. Verify 5 KPI summary cards in summary-cards-container
    const summaryCards = page.getByTestId('summary-cards-container');
    await expect(summaryCards.getByText('Total Headcount')).toBeVisible();
    await expect(summaryCards.getByText('Total Annual Payroll')).toBeVisible();
    await expect(summaryCards.getByText('Average Salary')).toBeVisible();
    await expect(summaryCards.getByText('Median Salary')).toBeVisible();
    await expect(summaryCards.getByText('Salary Range (Min – Max)')).toBeVisible();

    // 4. Verify visualizations and regional table
    await expect(page.getByText('Department Breakdown')).toBeVisible();
    await expect(page.getByText('Pay Band Distribution')).toBeVisible();
    await expect(page.getByText('Regional Compensation Breakdown')).toBeVisible();

    // 5. Test Department filter
    const deptSelect = page.locator('select[aria-label="Filter by department"]');
    await deptSelect.selectOption({ index: 1 }); // Select first department

    // Reset filters button should appear
    const resetBtn = page.getByRole('button', { name: /reset filters/i });
    await expect(resetBtn).toBeVisible();

    // 6. Test CSV Export download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export csv/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('salary-export.csv');

    // 7. Reset filters
    await resetBtn.click();
    await expect(resetBtn).not.toBeVisible();
  });
});
