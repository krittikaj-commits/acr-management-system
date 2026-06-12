import { test, expect } from '@playwright/test';

/**
 * E2E: Authentication flows
 * Tests login, anonymous CR creation, and approval link flow
 */

test.describe('Authentication Flows', () => {
  test('successful login with email and password', async ({ page }) => {
    await page.goto('/login');

    // Verify login form is visible
    await expect(page.locator('h1, h2')).toContainText(/login|เข้าสู่ระบบ/i);

    // Fill credentials
    await page.fill('[name="email"]', 'admin@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // User info should be visible
    await expect(page.locator('[data-testid="user-display-name"]')).toBeVisible();
  });

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'invalid@dits.co.th');
    await page.fill('[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"], .error-message')).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try accessing a protected route
    await page.goto('/change-requests');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('anonymous CR creation without login', async ({ page }) => {
    // Navigate to anonymous CR form (public route)
    await page.goto('/request');

    // Verify the anonymous form is accessible
    await expect(page.locator('h1, h2')).toContainText(/change request|คำขอเปลี่ยนแปลง/i);

    // Fill requester info (required for anonymous)
    await page.fill('[name="requesterName"]', 'John Doe');
    await page.fill('[name="requesterEmail"]', 'john.doe@company.com');
    await page.fill('[name="requesterDepartment"]', 'Engineering');
    await page.fill('[name="requesterPosition"]', 'Senior Developer');

    // Fill CR details
    await page.fill('[name="title"]', 'Anonymous CR - VPN Access Request');
    await page.selectOption('[name="changeType"]', 'VPN');
    await page.selectOption('[name="impactLevel"]', 'Low');
    await page.fill('[name="description"]', 'Need VPN access for remote work');
    await page.fill('[name="reason"]', 'Working from home arrangement');

    // Submit
    await page.click('button:has-text("Submit")');

    // Should show success confirmation
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();

    // Should display a reference number
    await expect(page.locator('[data-testid="cr-reference"]')).toBeVisible();
  });

  test('approval via email link (no login required)', async ({ page }) => {
    // Simulate clicking an approval link from email
    // The token contains the CR ID and approval action
    const approvalToken = 'test-approval-token-123';
    await page.goto(`/approve/${approvalToken}`);

    // Should show the CR details for approval
    await expect(page.locator('h1, h2')).toContainText(/approve|อนุมัติ/i);

    // Approver info should be pre-filled (from token)
    await expect(page.locator('[data-testid="approver-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="approver-position"]')).toBeVisible();

    // CR summary should be visible
    await expect(page.locator('[data-testid="cr-summary"]')).toBeVisible();

    // Approve the request
    await page.fill('[name="comment"]', 'Approved via email link');
    await page.click('button:has-text("Approve")');

    // Should show confirmation
    await expect(page.locator('[data-testid="approval-success"]')).toBeVisible();
  });

  test('approval link rejection flow', async ({ page }) => {
    const approvalToken = 'test-approval-token-456';
    await page.goto(`/approve/${approvalToken}`);

    // Reject the request
    await page.fill('[name="comment"]', 'Rejected - insufficient justification');
    await page.click('button:has-text("Reject")');

    // Should show confirmation
    await expect(page.locator('[data-testid="rejection-success"]')).toBeVisible();
  });

  test('expired approval link shows error', async ({ page }) => {
    const expiredToken = 'expired-token-789';
    await page.goto(`/approve/${expiredToken}`);

    // Should show expiration error
    await expect(page.locator('[data-testid="link-expired"]')).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Accessing protected route should redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
