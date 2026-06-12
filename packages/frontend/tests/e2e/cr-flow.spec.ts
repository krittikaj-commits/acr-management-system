import { test, expect } from '@playwright/test';

/**
 * E2E: Complete Change Request workflow
 * Tests the critical path: create → submit → assign → review → approve → implement → verify → close
 */

test.describe('Change Request Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user with Requester role
    await page.goto('/login');
    await page.fill('[name="email"]', 'requester@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('complete CR workflow: create → submit → assign → review → approve → implement → verify → close', async ({
    page,
    context,
  }) => {
    // Step 1: Create a new Change Request
    await page.goto('/change-requests/new');
    await expect(page.locator('h1')).toContainText('Change Request');

    await page.fill('[name="title"]', 'E2E Test - Server Configuration Change');
    await page.selectOption('[name="changeType"]', 'Server');
    await page.selectOption('[name="impactLevel"]', 'Medium');
    await page.fill('[name="description"]', 'Update server configuration for improved performance');
    await page.fill('[name="reason"]', 'Performance degradation reported by monitoring');
    await page.fill('[name="affectedService"]', 'Production Web Server');

    // Submit the CR
    await page.click('button:has-text("Submit")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Submitted');

    // Capture CR ID from URL or page content
    const crId = await page.locator('[data-testid="cr-id"]').textContent();
    expect(crId).toBeTruthy();

    // Step 2: Call Center assigns the CR
    // Login as Call Center
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'callcenter@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.goto(`/change-requests/${crId}`);
    await page.click('button:has-text("Assign")');
    await page.selectOption('[name="assignee"]', 'reviewer@dits.co.th');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('IT Review');

    // Step 3: IT Reviewer performs review
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'reviewer@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.goto(`/change-requests/${crId}`);
    await page.click('button:has-text("Review")');
    await page.fill('[name="impactAnalysis"]', 'Low risk - configuration change only');
    await page.fill('[name="implementationPlan"]', 'Update config file and restart service');
    await page.fill('[name="rollbackPlan"]', 'Revert config file from backup');
    await page.fill('[name="riskAssessment"]', 'Low');
    await page.click('button:has-text("Submit Review")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Approval');

    // Step 4: Approver approves the CR
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'approver@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.goto(`/change-requests/${crId}`);
    await page.click('button:has-text("Approve")');
    await page.fill('[name="approvalComment"]', 'Approved - low risk change');
    await page.click('button:has-text("Confirm Approval")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Implementation');

    // Step 5: Implementer performs implementation
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'implementer@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.goto(`/change-requests/${crId}`);
    await page.click('button:has-text("Start Implementation")');
    await page.fill('[name="implementationNotes"]', 'Config updated and service restarted');
    await page.fill('[name="version"]', '1.2.3');
    await page.click('button:has-text("Complete Implementation")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Verification');

    // Step 6: Verify the change
    await page.click('button:has-text("Verify")');
    await page.fill('[name="verificationNotes"]', 'Service running correctly with new config');
    await page.click('button:has-text("Confirm Verification")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Closed');
  });

  test('CR can be rejected during approval', async ({ page }) => {
    // Create and submit a CR
    await page.goto('/change-requests/new');
    await page.fill('[name="title"]', 'E2E Test - Rejected CR');
    await page.selectOption('[name="changeType"]', 'Application');
    await page.selectOption('[name="impactLevel"]', 'High');
    await page.fill('[name="description"]', 'High risk change that should be rejected');
    await page.fill('[name="reason"]', 'Testing rejection flow');
    await page.fill('[name="affectedService"]', 'Core Banking');
    await page.click('button:has-text("Submit")');

    const crId = await page.locator('[data-testid="cr-id"]').textContent();

    // Login as approver and reject
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'approver@dits.co.th');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await page.goto(`/change-requests/${crId}`);
    await page.click('button:has-text("Reject")');
    await page.fill('[name="rejectionReason"]', 'Risk too high - need more analysis');
    await page.click('button:has-text("Confirm Rejection")');
    await expect(page.locator('[data-testid="cr-status"]')).toContainText('Rejected');
  });
});
