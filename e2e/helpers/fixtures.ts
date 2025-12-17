/**
 * E2E Test Fixtures and Helpers
 *
 * Provides reusable test data, authentication helpers, and page object patterns
 * for end-to-end tests
 */

import { Page } from "@playwright/test";

/**
 * Test user credentials for different roles
 */
export const testUsers = {
  customer: {
    email: "customer@test.com",
    password: "Customer123!",
    role: "customer",
  },
  staff: {
    email: "staff@test.com",
    password: "Staff123!",
    role: "staff",
  },
  manager: {
    email: "manager@test.com",
    password: "Manager123!",
    role: "manager",
  },
  admin: {
    email: "admin@test.com",
    password: "Admin123!",
    role: "admin",
  },
};

/**
 * Test menu items for E2E scenarios
 */
export const testMenuItems = {
  espresso: {
    name: "Test Espresso",
    price: 2.5,
    category: "hot drinks",
    description: "Rich and bold espresso shot",
  },
  latte: {
    name: "Test Latte",
    price: 4.0,
    category: "hot drinks",
    description: "Smooth and creamy latte",
  },
  croissant: {
    name: "Test Croissant",
    price: 3.5,
    category: "food",
    description: "Buttery and flaky croissant",
  },
};

/**
 * Login helper - authenticates a user
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 10000,
  });
}

/**
 * Logout helper
 */
export async function logoutUser(page: Page): Promise<void> {
  // Look for logout button in navbar or user menu
  const logoutButton = page.locator(
    'button:has-text("Logout"), a:has-text("Logout")'
  );
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL("/auth/login", { timeout: 5000 });
  }
}

/**
 * Wait for API response helper
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === "string") {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Add item to cart helper
 */
export async function addItemToCart(
  page: Page,
  itemName: string
): Promise<void> {
  // Find the item card and click "Add to Cart" button
  const itemCard = page.locator(
    `[data-testid="menu-item"]:has-text("${itemName}")`
  );
  await itemCard.locator('button:has-text("Add to Cart")').click();

  // Wait for cart update
  await page.waitForTimeout(500);
}

/**
 * Open cart modal helper
 */
export async function openCart(page: Page): Promise<void> {
  await page.click('[data-testid="cart-button"], button:has-text("Cart")');
  await page.waitForSelector('[data-testid="cart-modal"]', {
    state: "visible",
    timeout: 5000,
  });
}

/**
 * Clear cart helper
 */
export async function clearCart(page: Page): Promise<void> {
  // Clear via localStorage
  await page.evaluate(() => {
    localStorage.removeItem("cart");
  });
}

/**
 * Navigate to menu page
 */
export async function navigateToMenu(page: Page): Promise<void> {
  await page.goto("/menu");
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to orders page
 */
export async function navigateToOrders(
  page: Page,
  role: string
): Promise<void> {
  if (role === "customer") {
    await page.goto("/customer/orders");
  } else if (role === "staff") {
    await page.goto("/staff/orders");
  } else if (role === "manager") {
    await page.goto("/manager/dashboard");
  }
  await page.waitForLoadState("networkidle");
}

/**
 * Check if element contains text
 */
export async function expectTextContent(
  page: Page,
  selector: string,
  text: string
): Promise<boolean> {
  const element = page.locator(selector);
  const content = await element.textContent();
  return content?.includes(text) || false;
}

/**
 * Wait for toast/notification message
 */
export async function waitForNotification(
  page: Page,
  message: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(
    `[role="alert"]:has-text("${message}"), .toast:has-text("${message}")`,
    { timeout }
  );
}
