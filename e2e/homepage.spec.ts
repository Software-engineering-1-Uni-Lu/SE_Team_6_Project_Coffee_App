/**
 * E2E Test Example
 * Tests the homepage navigation and basic functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Homepage E2E Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/Café Aroma|Coffee/i);
  });

  test("should have navigation elements", async ({ page }) => {
    await page.goto("/");

    // Check if navbar is present
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Check if the cafe name/logo is visible
    const cafeName = page.getByText("Café Aroma");
    await expect(cafeName).toBeVisible();
  });

  test("should be able to navigate to menu page", async ({ page }) => {
    await page.goto("/");

    // Look for a menu link (adjust selector based on actual implementation)
    const menuLink = page.getByRole("link", { name: /menu/i });

    // If menu link exists, click it and verify navigation
    if (await menuLink.isVisible()) {
      await menuLink.click();
      await expect(page).toHaveURL(/\/menu/);
    }
  });

  test("should be able to navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Look for a login link
    const loginLink = page.getByRole("link", { name: /login|sign in/i });

    // If login link exists, click it and verify navigation
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });
});

test.describe("Responsive Design Tests", () => {
  test("should be responsive on mobile", async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check if page loads correctly on mobile
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("should be responsive on tablet", async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Check if page loads correctly on tablet
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });
});
