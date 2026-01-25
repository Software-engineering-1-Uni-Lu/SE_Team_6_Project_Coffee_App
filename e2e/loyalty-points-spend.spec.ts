/**
 * E2E Test: Customer can pay with loyalty points.
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

const calculatePointsRequired = (
  items: Array<{ price: number; quantity: number }>,
  pointsPerEuro: number
) =>
  items.reduce((sum, item) => {
    const eurosRoundedUp = Math.ceil(item.price / 100);
    return sum + eurosRoundedUp * pointsPerEuro * item.quantity;
  }, 0);

test.describe("Customer Loyalty Points Spend", () => {
  test("Customer can pay with loyalty points", async ({ page }) => {
    const timestamp = Date.now();
    const customerEmail = `loyalty-spend-${timestamp}@test.com`;
    const customerPassword = "Test123!";
    const seededPoints = 500;

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

    if (!serviceClient) {
      throw new Error(
        "Missing Supabase service role credentials for loyalty points spend."
      );
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.id).toBeTruthy();

    const customerId = profile?.id as string;

    const { error: ledgerError } = await serviceClient
      .from("loyalty_ledger")
      .insert({
        customer_id: customerId,
        order_id: null,
        points_delta: seededPoints,
        reason: "Seed points for spend test",
      });

    expect(ledgerError).toBeNull();

    const { error: profileUpdateError } = await serviceClient
      .from("profiles")
      .update({ loyalty_points: seededPoints })
      .eq("id", customerId);

    expect(profileUpdateError).toBeNull();

    const { data: settings } = await serviceClient
      .from("settings")
      .select("points_per_euro")
      .single();
    const pointsPerEuro = settings?.points_per_euro || 10;

    // Add an item and checkout with loyalty points
    await page.goto("/menu");
    await page.waitForSelector('button:has-text("Add to Cart")', {
      timeout: 10000,
    });
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(500);

    await page.goto("/checkout");
    await page.waitForSelector('[data-testid="loyalty-points-required"]', {
      timeout: 10000,
    });

    await page
      .locator('button:has-text("Loyalty Points")')
      .click({ timeout: 10000 });

    const orderResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/orders") &&
        response.request().method() === "POST" &&
        response.status() === 201,
      { timeout: 15000 }
    );

    await page
      .locator('button:has-text("Place Order"), button[type="submit"]')
      .click();

    const orderResponse = await orderResponsePromise;
    const orderPayload = await orderResponse.json();
    const orderItems = orderPayload.order.items as Array<{
      price: number;
      quantity: number;
    }>;

    const pointsRequired = calculatePointsRequired(orderItems, pointsPerEuro);
    const expectedBalance = seededPoints - pointsRequired;

    await page.waitForURL(/\/order-confirmation\//, { timeout: 15000 });

    await expect(page.locator("text=Points Redeemed")).toBeVisible({
      timeout: 10000,
    });

    // Verify loyalty points on profile
    await page.goto("/auth/profile");
    await page.waitForSelector('[data-testid="loyalty-balance"]', {
      timeout: 15000,
    });

    const balanceText = await page
      .locator('[data-testid="loyalty-balance"]')
      .innerText();
    expect(Number(balanceText)).toBe(expectedBalance);

    await expect(
      page.locator('[data-testid="loyalty-entry"]').first()
    ).toContainText(`-${pointsRequired} pts`);

    // Idempotency check: reload and ensure balance is unchanged
    await page.reload();
    const balanceAfterReload = await page
      .locator('[data-testid="loyalty-balance"]')
      .innerText();
    expect(Number(balanceAfterReload)).toBe(expectedBalance);
  });
});
