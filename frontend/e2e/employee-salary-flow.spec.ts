import { test, expect } from '@playwright/test';

test.describe('QA-1: Employee Discovery & Salary Audit Flow', () => {
  test('login -> search employee -> update salary -> view history', async ({ page }) => {
    // 1. Navigate to /login and sign in
    await page.goto('/login');
    await page.fill('input#email', 'admin@acme.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // 2. Wait for successful login redirect
    await expect(page.locator('h1')).toHaveText('Executive Salary Analytics', { timeout: 10000 });

    // 3. Navigate to Employees page via navigation link
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page.locator('h1')).toHaveText('Employees Directory');

    // Wait for real employee rows to load (skipping skeleton rows)
    const employeeRow = page.locator('tbody tr[role="button"]').first();
    await expect(employeeRow).toBeVisible({ timeout: 10000 });

    // Click on the first employee row to open detail view
    await employeeRow.click();
    await expect(page).toHaveURL(/\/employees\/[a-f0-9-]+/);

    // 4. Verify detail sections
    await expect(page.getByText('Employee Profile')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Current Compensation')).toBeVisible();
    await expect(page.getByText('Compensation History')).toBeVisible();

    // 5. Open "Record Compensation Change" modal
    const recordBtn = page.locator('button[aria-label="Record compensation change"]');
    await expect(recordBtn).toBeVisible({ timeout: 5000 });
    await recordBtn.click();

    // Modal title & immutability warning
    await expect(page.getByRole('heading', { name: 'Record Compensation Change' })).toBeVisible();
    await expect(page.getByText(/permanent, immutable/i)).toBeVisible();

    // 6. Test client-side validation by trying 0 amount
    const amountInput = page.locator('input#amount');
    await amountInput.fill('0');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/amount must be greater than zero/i)).toBeVisible();

    // 7. Submit valid salary update
    await amountInput.fill('145000');
    await page.locator('input#currencyCode').fill('USD');
    await page.locator('input#grade').fill('G7');
    await page.locator('input#band').fill('Senior');
    await page.locator('input#reason').fill('Promotion & Merit Adjustment');
    await page.locator('textarea#notes').fill('Promoted with stellar annual rating');

    await page.locator('button[type="submit"]').click();

    // 8. Confirm success alert
    await expect(page.getByText(/compensation change recorded/i)).toBeVisible();

    // 9. Verify live UI update after modal auto-closes
    await expect(page.locator('h2:has-text("$145,000")')).toBeVisible({ timeout: 8000 });

    // 10. Verify history table has updated with new record and has no edit/delete buttons
    await expect(page.getByText('Promotion & Merit Adjustment').first()).toBeVisible();
    await expect(page.getByText('admin@acme.com').first()).toBeVisible();

    // Zero edit/delete buttons on audit records
    await expect(page.locator('tbody button:has-text("Edit"), tbody button:has-text("Delete")')).toHaveCount(0);
  });
});
