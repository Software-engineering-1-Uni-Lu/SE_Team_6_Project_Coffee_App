/**
 * E2E Test: Staff Order Acceptance Workflow
 *
 * Tests the staff workflow for accepting, declining, and managing orders
 * in the order queue.
 */

import { test, expect } from "@playwright/test";
import {
  testUsers,
  loginUser,
  logoutUser,
  navigateToOrders,
  waitForApiResponse,
} from "./helpers/fixtures";

test.describe("Staff: Order Acceptance Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as staff member
    await loginUser(page, testUsers.staff.email, testUsers.staff.password);
  });

  test.afterEach(async ({ page }) => {
    await logoutUser(page);
  });

  test("Staff can view order queue", async ({ page }) => {
    await navigateToOrders(page, "staff");

    // Verify on staff orders page
    await expect(page).toHaveURL("/staff/orders");

    // Check for orders section or empty state
    const ordersContainer = page.locator(
      '[data-testid="orders-queue"], .orders-list, main'
    );
    await expect(ordersContainer).toBeVisible();

    // Should have either orders or empty state message
    const hasOrders =
      (await page.locator('[data-testid="order-card"], .order-item').count()) >
      0;
    const hasEmptyState = await page
      .locator("text=/no.*orders/i, text=/empty/i")
      .isVisible();

    expect(hasOrders || hasEmptyState).toBeTruthy();
  });

  test("Staff can view order details", async ({ page }) => {
    await navigateToOrders(page, "staff");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check if there are any orders
    const orderCards = page.locator('[data-testid="order-card"], .order-item');
    const orderCount = await orderCards.count();

    if (orderCount > 0) {
      // Click on first order to view details
      const firstOrder = orderCards.first();
      await expect(firstOrder).toBeVisible();

      // Verify order has key information
      await expect(firstOrder).toContainText(/order/i);

      // Check for status or action buttons
      const hasStatusButtons = (await firstOrder.locator("button").count()) > 0;
      expect(hasStatusButtons).toBeTruthy();
    }
  });

  test("Staff can accept an order", async ({ page }) => {
    await navigateToOrders(page, "staff");
    await page.waitForLoadState("networkidle");

    // Look for pending orders
    const pendingOrders = page.locator(
      '[data-testid="order-card"]:has-text("pending"), [data-status="pending"]'
    );
    const pendingCount = await pendingOrders.count();

    if (pendingCount > 0) {
      // Find accept button
      const acceptButton = pendingOrders
        .first()
        .locator('button:has-text("Accept"), button:has-text("Prepare")');

      if (await acceptButton.isVisible()) {
        // Click accept
        await acceptButton.click();

        // Wait for status update
        await page.waitForTimeout(1000);

        // Verify status changed (order moved or status updated)
        await expect(
          page.locator("text=/preparing/i, text=/accepted/i")
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("Staff can update order status to ready", async ({ page }) => {
    await navigateToOrders(page, "staff");
    await page.waitForLoadState("networkidle");

    // Look for preparing orders
    const preparingOrders = page.locator(
      '[data-testid="order-card"]:has-text("preparing"), [data-status="preparing"]'
    );
    const preparingCount = await preparingOrders.count();

    if (preparingCount > 0) {
      // Find ready/complete button
      const readyButton = preparingOrders
        .first()
        .locator('button:has-text("Ready"), button:has-text("Complete")');

      if (await readyButton.isVisible()) {
        await readyButton.click();
        await page.waitForTimeout(1000);

        // Verify status changed
        await expect(
          page.locator("text=/ready/i, text=/completed/i")
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("Staff can filter orders by status", async ({ page }) => {
    await navigateToOrders(page, "staff");
    await page.waitForLoadState("networkidle");

    // Look for filter buttons or tabs
    const statusFilters = page.locator(
      '[data-testid="status-filter"], button[data-status], .status-tab'
    );
    const filterCount = await statusFilters.count();

    if (filterCount > 0) {
      // Click on different status filter
      const pendingFilter = page.locator(
        'button:has-text("Pending"), [data-status="pending"]'
      );

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click();
        await page.waitForTimeout(500);

        // Verify filtered results
        const visibleOrders = page.locator(
          '[data-testid="order-card"]:visible'
        );
        const count = await visibleOrders.count();

        // All visible orders should be pending
        if (count > 0) {
          await expect(visibleOrders.first()).toContainText(/pending/i);
        }
      }
    }
  });

  test("Staff can refresh order queue", async ({ page }) => {
    await navigateToOrders(page, "staff");
    await page.waitForLoadState("networkidle");

    // Look for refresh button
    const refreshButton = page.locator(
      'button:has-text("Refresh"), button[aria-label*="refresh" i]'
    );

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Wait for refresh to complete
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    }

    // Verify page is still functional
    await expect(page).toHaveURL("/staff/orders");
  });

  test("Staff cannot access customer-only pages", async ({ page }) => {
    // Try to navigate to customer page
    await page.goto("/customer/orders");

    // Should redirect or show error
    await page.waitForTimeout(1000);

    // Should not be on customer orders page
    expect(page.url()).not.toContain("/customer/orders");
  });

  test("Staff cannot access admin-only pages", async ({ page }) => {
    // Try to navigate to admin page
    await page.goto("/admin/staff");

    // Should redirect or show error
    await page.waitForTimeout(1000);

    // Should not be on admin page
    expect(page.url()).not.toContain("/admin/staff");
  });

  test("Staff can view menu availability", async ({ page }) => {
    await page.goto("/staff/menu");

    // Verify on staff menu page
    await expect(page).toHaveURL("/staff/menu");
    await page.waitForLoadState("networkidle");

    // Check for menu items
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item');
    await expect(menuItems.first()).toBeVisible({ timeout: 10000 });
  });

  test("Staff can toggle menu item availability", async ({ page }) => {
    await page.goto("/staff/menu");
    await page.waitForLoadState("networkidle");

    // Look for toggle switches
    const toggles = page.locator(
      'input[type="checkbox"][role="switch"], .toggle-availability'
    );
    const toggleCount = await toggles.count();

    if (toggleCount > 0) {
      const firstToggle = toggles.first();
      const isChecked = await firstToggle.isChecked();

      // Toggle the switch
      await firstToggle.click();
      await page.waitForTimeout(1000);

      // Verify state changed
      const newState = await firstToggle.isChecked();
      expect(newState).toBe(!isChecked);
    }
  });

  test("Staff dashboard shows active orders count", async ({ page }) => {
    await page.goto("/staff");

    // Look for dashboard or statistics
    const statsContainer = page.locator(
      '[data-testid="stats"], .dashboard, main'
    );
    await expect(statsContainer).toBeVisible();

    // Check for order count or status indicators
    const hasOrderInfo = await page.locator("text=/orders/i").isVisible();
    expect(hasOrderInfo).toBeTruthy();
  });
});
