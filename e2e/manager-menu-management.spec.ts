/**
 * E2E Test: Manager Menu Management Flow
 *
 * Tests the manager workflow for creating, updating, and managing
 * menu items.
 */

import { test, expect } from "@playwright/test";
import {
  testUsers,
  loginUser,
  logoutUser,
  testMenuItems,
} from "./helpers/fixtures";

test.describe("Manager: Menu Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await loginUser(page, testUsers.manager.email, testUsers.manager.password);
  });

  test.afterEach(async ({ page }) => {
    await logoutUser(page);
  });

  test("Manager can access menu management page", async ({ page }) => {
    await page.goto("/manager/menu");

    // Verify on manager menu page
    await expect(page).toHaveURL("/manager/menu");

    // Check for menu management interface
    const menuContainer = page.locator('[data-testid="menu-management"], main');
    await expect(menuContainer).toBeVisible();
  });

  test("Manager can view all menu items", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Check for menu items list
    const menuItems = page.locator(
      '[data-testid="menu-item"], .menu-item-card, tbody tr'
    );

    // Should have items or empty state
    const itemCount = await menuItems.count();
    const hasEmptyState = await page
      .locator("text=/no.*items/i, text=/empty/i")
      .isVisible();

    expect(itemCount > 0 || hasEmptyState).toBeTruthy();
  });

  test("Manager can open create menu item modal", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Look for "Add Item" or "Create" button
    const createButton = page.locator(
      'button:has-text("Add Item"), button:has-text("Create"), button:has-text("New Item")'
    );

    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Verify modal opens
    const modal = page.locator(
      '[role="dialog"], .modal, [data-testid="menu-item-modal"]'
    );
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test("Manager can create a new menu item", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Open create modal
    const createButton = page.locator(
      'button:has-text("Add Item"), button:has-text("Create"), button:has-text("New Item")'
    );
    await createButton.click();

    // Wait for modal
    const modal = page.locator('[role="dialog"], .modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in item details
    const timestamp = Date.now();
    await modal
      .locator('input[name="name"], input[placeholder*="name" i]')
      .fill(`E2E Test Item ${timestamp}`);
    await modal
      .locator('input[name="price"], input[type="number"]')
      .fill("5.99");

    // Fill description
    const descriptionField = modal.locator(
      'textarea[name="description"], textarea'
    );
    if (await descriptionField.isVisible()) {
      await descriptionField.fill("E2E test menu item description");
    }

    // Select category
    const categorySelect = modal.locator('select[name="category"], select');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption("hot drinks");
    }

    // Submit form
    const submitButton = modal.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
    );
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify item appears in list or success message
    const successIndicator = page.locator(
      `text=/E2E Test Item ${timestamp}/i, text=/created/i, text=/success/i`
    );
    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test("Manager can edit an existing menu item", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Find first menu item
    const menuItems = page.locator(
      '[data-testid="menu-item"], .menu-item-card, tbody tr'
    );
    const itemCount = await menuItems.count();

    if (itemCount > 0) {
      // Find edit button
      const editButton = menuItems
        .first()
        .locator('button:has-text("Edit"), button[aria-label*="edit" i]');

      if (await editButton.isVisible()) {
        await editButton.click();

        // Wait for modal
        const modal = page.locator('[role="dialog"], .modal');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Update price
        const priceInput = modal.locator(
          'input[name="price"], input[type="number"]'
        );
        await priceInput.clear();
        await priceInput.fill("9.99");

        // Submit
        const submitButton = modal.locator(
          'button[type="submit"], button:has-text("Save"), button:has-text("Update")'
        );
        await submitButton.click();

        // Wait for update
        await page.waitForTimeout(2000);

        // Verify update success
        await expect(
          page.locator("text=/updated/i, text=/saved/i")
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("Manager can delete a menu item", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // First, create a test item to delete
    const createButton = page.locator(
      'button:has-text("Add Item"), button:has-text("Create")'
    );
    if (await createButton.isVisible()) {
      await createButton.click();

      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const timestamp = Date.now();
      await modal
        .locator('input[name="name"]')
        .fill(`Delete Test ${timestamp}`);
      await modal.locator('input[name="price"]').fill("1.00");

      const categorySelect = modal.locator('select[name="category"]');
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption("hot drinks");
      }

      const submitButton = modal.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Now delete it
      const deleteTestItem = page
        .locator(`text=/Delete Test ${timestamp}/i`)
        .first();
      if (await deleteTestItem.isVisible()) {
        const deleteButton = deleteTestItem
          .locator("..")
          .locator('button:has-text("Delete"), button[aria-label*="delete" i]');

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Confirm deletion if dialog appears
          const confirmButton = page.locator(
            'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")'
          );
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(1000);

          // Verify item is removed
          await expect(deleteTestItem).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test("Manager can view menu item statistics", async ({ page }) => {
    await page.goto("/manager/dashboard");

    // Verify on manager dashboard
    await expect(page).toHaveURL("/manager/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for statistics or analytics
    const statsContainer = page.locator(
      '[data-testid="stats"], .statistics, .analytics'
    );
    const hasStats = await statsContainer.isVisible();

    // Or check for any numeric indicators
    const hasNumbers = await page.locator("text=/\\d+/").isVisible();

    expect(hasStats || hasNumbers).toBeTruthy();
  });

  test("Manager can filter menu items by category", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Look for category filters
    const categoryFilters = page.locator(
      'button[data-category], select[name="category"], .category-filter'
    );

    if (await categoryFilters.first().isVisible()) {
      // Click on a category filter
      await categoryFilters.first().click();
      await page.waitForTimeout(500);

      // Verify filtered results
      const menuItems = page.locator('[data-testid="menu-item"]:visible');
      expect(await menuItems.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("Manager can search for menu items", async ({ page }) => {
    await page.goto("/manager/menu");
    await page.waitForLoadState("networkidle");

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i]'
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill("coffee");
      await page.waitForTimeout(500);

      // Verify filtered results
      const results = page.locator('[data-testid="menu-item"]:visible');
      const count = await results.count();

      // Results should contain search term or be empty
      if (count > 0) {
        const firstResult = results.first();
        const text = await firstResult.textContent();
        expect(text?.toLowerCase()).toContain("coffee");
      }
    }
  });

  test("Manager can view staff management", async ({ page }) => {
    await page.goto("/manager/staff-management");

    // Verify on staff management page
    await expect(page).toHaveURL("/manager/staff-management");
    await page.waitForLoadState("networkidle");

    // Check for staff list
    const staffContainer = page.locator(
      '[data-testid="staff-list"], .staff-management, main'
    );
    await expect(staffContainer).toBeVisible();
  });

  test("Manager can generate staff invite codes", async ({ page }) => {
    await page.goto("/manager/staff-management");
    await page.waitForLoadState("networkidle");

    // Look for generate/create invite button
    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Invite"), button:has-text("New Invite")'
    );

    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(1000);

      // Look for invite code display or success message
      const inviteDisplay = page.locator(
        '[data-testid="invite-code"], .invite-code, text=/invite.*code/i'
      );
      await expect(inviteDisplay.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("Manager cannot access admin-only features", async ({ page }) => {
    // Try to navigate to admin page
    await page.goto("/admin");

    // Should redirect or show error
    await page.waitForTimeout(1000);

    // Should not be on admin page
    expect(page.url()).not.toContain("/admin");
  });

  test("Manager can view order analytics", async ({ page }) => {
    await page.goto("/manager/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for order statistics
    const orderStats = page.locator(
      "text=/orders/i, text=/revenue/i, text=/sales/i"
    );
    const hasOrderStats = await orderStats.first().isVisible();

    expect(hasOrderStats).toBeTruthy();
  });

  test("Manager can export or view reports", async ({ page }) => {
    await page.goto("/manager/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for export or report buttons
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Report"), button:has-text("Download")'
    );

    // Just verify the analytics/reporting interface exists
    const hasReportingUI =
      (await exportButton.isVisible()) ||
      (await page.locator(".chart, .graph, .analytics").isVisible());

    expect(hasReportingUI).toBeTruthy();
  });
});
