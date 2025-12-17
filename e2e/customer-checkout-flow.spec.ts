/**
 * E2E Test: Customer Menu Browsing → Add to Cart → Checkout
 *
 * Tests the complete customer journey from browsing the menu,
 * adding items to cart, and completing checkout as a guest or authenticated user.
 */

import { test, expect } from "@playwright/test";
import {
  testUsers,
  loginUser,
  clearCart,
  navigateToMenu,
  addItemToCart,
  openCart,
  waitForApiResponse,
} from "./helpers/fixtures";

test.describe("Customer: Menu Browsing → Cart → Checkout", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart before each test
    await page.goto("/");
    await clearCart(page);
  });

  test("Guest user can browse menu and view items", async ({ page }) => {
    await navigateToMenu(page);

    // Verify menu page loads
    await expect(page).toHaveURL("/menu");

    // Check for menu items (should have at least one item)
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item');
    await expect(menuItems.first()).toBeVisible({ timeout: 10000 });

    // Verify item details are visible
    const firstItem = menuItems.first();
    await expect(firstItem).toContainText(/\$\d+\.\d{2}/); // Price format
  });

  test("Guest user can add items to cart", async ({ page }) => {
    await navigateToMenu(page);

    // Wait for menu items to load
    await page.waitForSelector('[data-testid="menu-item"], .menu-item', {
      timeout: 10000,
    });

    // Add first available item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart")')
      .first();
    await addToCartButton.click();

    // Verify cart icon shows count
    const cartBadge = page.locator('[data-testid="cart-badge"], .cart-count');
    await expect(cartBadge).toBeVisible({ timeout: 5000 });
    await expect(cartBadge).toContainText("1");
  });

  test("Guest user can view cart modal", async ({ page }) => {
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Open cart modal
    const cartButton = page.locator(
      '[data-testid="cart-button"], button:has-text("Cart")'
    );
    await cartButton.click();

    // Verify cart modal appears
    const cartModal = page.locator(
      '[data-testid="cart-modal"], [role="dialog"]'
    );
    await expect(cartModal).toBeVisible({ timeout: 5000 });

    // Verify cart has items
    await expect(cartModal).toContainText(/total/i);
  });

  test("Guest user can complete checkout", async ({ page }) => {
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Navigate to checkout
    await page.goto("/checkout");
    await expect(page).toHaveURL("/checkout");

    // Fill guest information
    await page.fill(
      'input[name="guestName"], input[placeholder*="name" i]',
      "Test Guest"
    );
    await page.fill(
      'input[name="guestPhone"], input[placeholder*="phone" i]',
      "123-456-7890"
    );
    await page.fill(
      'input[name="guestEmail"], input[type="email"]',
      "guest@test.com"
    );

    // Select payment method
    const cashOption = page.locator(
      'input[value="cash"], label:has-text("Cash")'
    );
    if (await cashOption.isVisible()) {
      await cashOption.click();
    }

    // Submit order
    const placeOrderButton = page.locator(
      'button:has-text("Place Order"), button[type="submit"]'
    );
    await placeOrderButton.click();

    // Wait for order confirmation
    await page.waitForURL(/\/order-confirmation/, { timeout: 15000 });

    // Verify confirmation page
    await expect(
      page.locator("text=/order.*placed/i, text=/thank you/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Authenticated customer can complete checkout", async ({ page }) => {
    // Login as customer
    await loginUser(
      page,
      testUsers.customer.email,
      testUsers.customer.password
    );

    // Navigate to menu
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Navigate to checkout
    await page.goto("/checkout");

    // Select payment method (customer info should be pre-filled)
    const cashOption = page.locator(
      'input[value="cash"], label:has-text("Cash")'
    );
    if (await cashOption.isVisible()) {
      await cashOption.click();
    }

    // Submit order
    const placeOrderButton = page.locator(
      'button:has-text("Place Order"), button[type="submit"]'
    );

    // Wait for API call to complete
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/orders") && response.status() === 201,
      { timeout: 15000 }
    );

    await placeOrderButton.click();
    await responsePromise;

    // Verify redirect to confirmation
    await page.waitForURL(/\/order-confirmation/, { timeout: 10000 });
    await expect(
      page.locator("text=/order.*placed/i, text=/thank you/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Customer can add multiple items to cart", async ({ page }) => {
    await navigateToMenu(page);

    // Wait for menu items
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });

    // Add multiple items
    const addButtons = page.locator('button:has-text("Add to Cart")');
    const count = Math.min(await addButtons.count(), 3);

    for (let i = 0; i < count; i++) {
      await addButtons.nth(i).click();
      await page.waitForTimeout(500);
    }

    // Verify cart count
    const cartBadge = page.locator('[data-testid="cart-badge"], .cart-count');
    await expect(cartBadge).toBeVisible();

    const badgeText = await cartBadge.textContent();
    expect(parseInt(badgeText || "0")).toBeGreaterThanOrEqual(count);
  });

  test("Customer can remove items from cart", async ({ page }) => {
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Open cart
    const cartButton = page.locator(
      '[data-testid="cart-button"], button:has-text("Cart")'
    );
    await cartButton.click();

    // Wait for cart modal
    const cartModal = page.locator(
      '[data-testid="cart-modal"], [role="dialog"]'
    );
    await expect(cartModal).toBeVisible({ timeout: 5000 });

    // Remove item
    const removeButton = cartModal.locator(
      'button:has-text("Remove"), [aria-label*="remove" i]'
    );
    if (await removeButton.isVisible()) {
      await removeButton.first().click();
      await page.waitForTimeout(500);

      // Verify cart is empty
      await expect(cartModal).toContainText(/empty/i);
    }
  });

  test("Cart persists across page navigation", async ({ page }) => {
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Navigate away and back
    await page.goto("/");
    await page.waitForTimeout(500);
    await navigateToMenu(page);

    // Verify cart still has items
    const cartBadge = page.locator('[data-testid="cart-badge"], .cart-count');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toContainText("1");
  });

  test("Checkout validates required fields", async ({ page }) => {
    await navigateToMenu(page);

    // Add item to cart
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1000);

    // Navigate to checkout
    await page.goto("/checkout");

    // Try to submit without filling fields
    const placeOrderButton = page.locator(
      'button:has-text("Place Order"), button[type="submit"]'
    );
    await placeOrderButton.click();

    // Should show validation errors or prevent submission
    await page.waitForTimeout(1000);

    // Verify we're still on checkout page (not redirected)
    await expect(page).toHaveURL("/checkout");
  });
});
