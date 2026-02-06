/**
 * E2E Test: Customer earns loyalty points immediately after a paid card order.
 */

import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { clearCart } from "./helpers/fixtures";

const loadEnv = () => {
  const envPath = path.join(process.cwd(), ".env.local");
  const values: Record<string, string> = {};

  if (!fs.existsSync(envPath)) {
    return values;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    values[key] = rest.join("=").trim();
  }

  return values;
};

const envValues = loadEnv();
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  envValues.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  envValues.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const serviceClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

test.describe("Customer Loyalty Points", () => {
  test("Customer earns points immediately after card payment", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const customerEmail = `loyalty-${timestamp}@test.com`;
    const customerPassword = "Test123!";

    await page.goto("/");
    await clearCart(page);

    // Register a new customer
    await page.goto("/auth/register");
    await page.fill('input[type="email"]', customerEmail);
    await page.fill('input[id="password"]', customerPassword);
    await page.fill('input[id="confirmPassword"]', customerPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/auth/register"), {
      timeout: 15000,
    });

    // Add an item and checkout with card payment
    await page.goto("/menu");
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(500);

    await page.goto("/checkout");
    await page.waitForSelector('input[name="cardNumber"]', {
      timeout: 10000,
    });
    await page.fill('input[name="cardNumber"]', "4242 4242 4242 4242");
    await page.fill('input[name="cardName"]', "Loyalty Tester");
    await page.fill('input[name="expiry"]', "12/30");
    await page.fill('input[name="cvc"]', "123");

    const orderResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/orders") &&
        response.request().method() === "POST",
      { timeout: 15000 }
    );

    await page
      .locator('button:has-text("Place Order"), button[type="submit"]')
      .click();

    const orderResponse = await orderResponsePromise;
    if (orderResponse.status() !== 201) {
      const errorBody = await orderResponse.text();
      throw new Error(
        `Order creation failed (${orderResponse.status()}): ${errorBody}`
      );
    }
    const orderPayload = await orderResponse.json();
    const totalCents = orderPayload.order.total_cents;
    let pointsPerEuro = 10;
    if (serviceClient) {
      const { data: settings } = await serviceClient
        .from("settings")
        .select("points_per_euro")
        .single();
      if (settings?.points_per_euro) {
        pointsPerEuro = settings.points_per_euro;
      }
    }
    const expectedPoints = Math.floor(totalCents / 100) * pointsPerEuro;

    await page.waitForURL(/\/order-confirmation/, { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Verify loyalty points on profile
    await page.goto("/auth/profile");
    const balanceLocator = page.locator('[data-testid="loyalty-balance"]');
    await expect(balanceLocator).toHaveText(String(expectedPoints), {
      timeout: 15000,
    });

    await expect(
      page.locator('[data-testid="loyalty-entry"]').first()
    ).toContainText(`+${expectedPoints} pts`);

    // Idempotency check: reload and ensure balance is unchanged
    await page.reload();
    const balanceAfterReload = await page
      .locator('[data-testid="loyalty-balance"]')
      .innerText();
    expect(Number(balanceAfterReload)).toBe(expectedPoints);
  });
});
