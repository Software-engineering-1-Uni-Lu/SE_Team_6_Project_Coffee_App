# PR Description: CSA-214 Modify In-Stock Quantity (Ingredient-Based Model)

**Branch:** `feature/modify-in-stock-quantity`  
**Author:** Hedi  
**Date:** January 19, 2026

---

## Objective

Implement **CSA-214: Modify In-Stock Quantity** and **Mark items sold out**, aligned with the team’s **ingredient-based model**: stock is tracked on **ingredients (beans)**, not on menu items. Menu items consume ingredients via `item_ingredients`; when an order is confirmed, a DB trigger deducts ingredient stock. Items are shown as sold out when any recipe ingredient has insufficient stock.

---

## What Was Implemented

### 1. Ingredient-Based Stock & Audit

- **Stock on beans:** Stock is tracked on the `beans` table (ingredients). PATCH `/api/manager/ingredients/[id]/stock` updates `beans.stock_quantity` by ingredient (bean) id and writes to `bean_stock_audit_log`.
- **Bean stock audit log:** New table `bean_stock_audit_log` (migration `20260202000000_bean_stock_audit_log.sql`) with RLS policies; idempotent policies via `DROP POLICY IF EXISTS` before `CREATE POLICY`.
- **Bulk import:** POST `/api/manager/ingredients/bulk-import` validates and updates `beans` and inserts into `bean_stock_audit_log` (ingredient_id, reason, note).
- **Audit log API:** GET `/api/manager/ingredients/audit-log` and GET `/api/manager/ingredients/audit-log/export` query `bean_stock_audit_log`, join `beans` and `profiles`, and expose `ingredient_id` / `ingredient_name` (CSV export uses “Ingredient Name” header).

### 2. Manager UI

- **Manager dashboard (`/manager/dashboard`):** In `dashboard-content.tsx`, the "Low Stock Alerts" widget was updated to fetch from the **beans** table (ingredients) instead of items: it displays ingredient name, stock quantity, low stock threshold, and unit (e.g. "500 g"). Copy updated to refer to "ingredients" / "Low Stock Alerts".
- **Menu management (`/manager/menu`):** Removed item-level stock display and stock adjustment from the menu list. Added links to **Ingredients**, **Bulk Import**, and **Audit Log** and copy explaining that drink stock is managed per ingredient.
- **Ingredients page (`/manager/ingredients`):** “Adjust Stock” per ingredient opens `StockAdjustmentModal` (passing the bean/ingredient). Low-stock styling (red when stock ≤ threshold). Detail modal and Create/Edit modal use proper `<dl>` for Supplier/Categories and accessible form labels (ids, aria-labels).
- **Menu item modal (create/edit):** For **Coffee/drinks** categories (slug `coffee` or name contains “drink”/“coffee”), only the short “Inventory” note and link to Ingredients are shown. For **other categories** (e.g. muffins, retail), the full **Inventory Management** block remains (Track Inventory, Stock Quantity, Low Stock Threshold, Reorder Quantity).
- **Stock adjustment modal:** Supports optional `unit`; labels use “Ingredient” and show units (e.g. “Current Stock: 500 g”).

### 3. Customer Menu – Sold Out from Ingredients

- **Logic:** Customer menu fetches `item_ingredients` with `beans(stock_quantity)`. Items are out of stock when any recipe row has `stock_quantity < quantity_needed`. Those items get `sold_out: true` (combined with existing `sold_out` flag).
- **Shared lib:** `src/lib/menu-availability.ts` – `computeOutOfStockItemIds(recipeData)`, `enrichItemsWithSoldOut(items, outOfStockIds)`, and `getAvailabilityStatus(item)` for low-stock/sold-out badges. Customer menu uses these helpers so the same logic is tested.

### 4. Coffee Recipes (Default Quantities)

- **Milk ingredient:** Migration `20260202100000_seed_coffee_recipes.sql` ensures a “Milk” ingredient (unit `ml`) exists.
- **Recipes:** Default `item_ingredients` for coffee drinks (by item slug): Espresso 18 g (House Blend); Americano 18 g; Cappuccino 18 g + 120 ml Milk; Latte 18 g + 250 ml Milk; Flat White 18 g + 150 ml Milk. Uses `ON CONFLICT (item_id, bean_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed`.

### 5. Order Confirmation → Ingredient Deduction

- **DB trigger:** `deduct_ingredients_on_confirm` (in `20260201000000_ingredients_and_recipes.sql`) runs on `orders` UPDATE when status goes `pending` → `confirmed`; for each order line it deducts `quantity_needed * order_quantity` from the corresponding `beans.stock_quantity` via `item_ingredients`.
- **Tests:** Order PATCH test documents that updating status to `confirmed` triggers this behaviour (API calls `from("orders").update({ status: "confirmed" })`; deduction happens in DB).

### 6. Low Stock & Availability

- **Staff/colleague behaviour:** Low stock is shown where stock ≤ low_stock_threshold (e.g. manager ingredients table, staff menu badges, manager dashboard). `getAvailabilityStatus()` in `menu-availability.ts` is unit-tested (sold-out when stock 0 or !is_available_now; low-stock when stock ≤ threshold; else available).

### 7. Tests

- **Menu availability:** `src/lib/__tests__/menu-availability.test.ts` – sold out when ingredients insufficient, enrich items with sold_out, low-stock/available/sold-out status.
- **Orders:** `app/api/orders/[id]/__tests__/route.test.ts` – new test that PATCH to `confirmed` calls orders update (DB trigger deducts ingredients).
- **Manager ingredients:** All manager-ingredient tests updated to **beans** and **bean_stock_audit_log**: stock route, audit-log, audit-log export, bulk-import (mocks, fixtures, and assertions use bean ids and “Ingredient” naming). Full suite: **610 tests, 38 suites**, all passing.

### 8. Accessibility & Small Fixes

- **Staff orders page:** Orders list section uses `role="region"` (replacing `role="tabpanel"`) to match the filter button group.
- **Manager menu item modal:** Category select and recipe ingredient selects have ids/aria-labels; file input has aria-label and title; checkbox has aria-label.
- **Ingredients page:** Detail modal uses `<dl>` for Supplier/Categories; Create/Edit form inputs have htmlFor/ids and aria-labels.

### 9. Build / ESLint clean-ups

- **Audit log page (`app/manager/ingredients/audit-log/page.tsx`):** `fetchAuditLog` wrapped in `useCallback` with `[currentPage, filters]`; `useEffect` depends on `[fetchAuditLog]` to satisfy `react-hooks/exhaustive-deps`.
- **Manager menu item modal:** Image preview uses Next.js `<Image />` (fill, unoptimized) instead of `<img>` to satisfy `@next/next/no-img-element`.
- **Pickup time picker (`src/components/pickup-time-picker.tsx`):** `getMinTime` wrapped in `useCallback`; `validateTime` dependency array includes `getMinTime` for `react-hooks/exhaustive-deps`.

---

## Files Modified / Added

**Migrations**

- `supabase/migrations/20260202000000_bean_stock_audit_log.sql` – bean_stock_audit_log table, indexes, RLS (idempotent policies).
- `supabase/migrations/20260202100000_seed_coffee_recipes.sql` – Milk ingredient, default coffee recipes (House Blend + Milk).

**API (manager ingredients)**

- `app/api/manager/ingredients/[id]/stock/route.ts` – PATCH by bean id, beans + bean_stock_audit_log.
- `app/api/manager/ingredients/bulk-import/route.ts` – validate/update beans, insert bean_stock_audit_log.
- `app/api/manager/ingredients/audit-log/route.ts` – query bean_stock_audit_log, format ingredient_id/ingredient_name.
- `app/api/manager/ingredients/audit-log/export/route.ts` – CSV with “Ingredient Name” etc.
- Corresponding `__tests__` under each of the above – mocks/fixtures updated to beans and bean_stock_audit_log.

**Lib**

- `src/lib/menu-availability.ts` – computeOutOfStockItemIds, enrichItemsWithSoldOut, getAvailabilityStatus.
- `src/lib/__tests__/menu-availability.test.ts` – unit tests for above.

**Pages & components**

- `app/manager/menu/page.tsx` – removed item stock UI; links to Ingredients, Bulk Import, Audit Log.
- `app/manager/ingredients/page.tsx` – Adjust Stock + modal; detail/create-edit accessibility (dl, labels).
- `app/manager/ingredients/bulk-import/page.tsx` – (existing) used with bean-based API.
- `app/manager/ingredients/audit-log/page.tsx` – (existing) used with bean_stock_audit_log.
- `src/components/manager-menu-item-modal.tsx` – conditional Inventory: drinks/coffee → note + link; others → full Inventory Management. Accessibility for category/recipe inputs and file input.
- `src/components/stock-adjustment-modal.tsx` – optional unit, “Ingredient” labels.
- `app/menu/page.tsx` – sold out from ingredients via menu-availability helpers.
- `app/manager/dashboard/dashboard-content.tsx` – Low Stock Alerts widget fetches from `beans` (ingredients), shows name, stock, threshold, unit.

**Orders**

- `app/api/orders/[id]/__tests__/route.test.ts` – test that confirming order calls orders update (ingredient deduction in DB).

**Staff**

- `app/staff/orders/page.tsx` – orders list section `role="region"`.

---

## Migrations

- **Applied:** `20260202000000_bean_stock_audit_log.sql` (bean_stock_audit_log table, RLS) and `20260202100000_seed_coffee_recipes.sql` (Milk ingredient, default coffee recipes) have been run against the database.

---

## Testing Checklist

- [x] Manager can adjust ingredient stock on `/manager/ingredients` and see audit entries.
- [x] Bulk import CSV updates beans and writes to bean_stock_audit_log; audit log and export show ingredient_id/ingredient_name.
- [x] Customer menu marks items sold out when any recipe ingredient has insufficient stock; add-to-cart disabled for sold-out items.
- [x] Coffee/drinks category in menu item modal shows only ingredient note; other categories show full Inventory Management.
- [x] Order status PATCH to `confirmed` is tested; DB trigger deducts ingredients (documented in test).
- [x] Menu availability lib tests: out-of-stock set, enrich sold_out, getAvailabilityStatus (low-stock/sold-out/available).
- [x] All manager ingredients API tests updated to beans/bean_stock_audit_log; full test suite passes (610 tests, 38 suites).
- [x] Accessibility: staff orders region, manager modal labels/aria, ingredients page dl and form labels.
- [x] Build / ESLint: audit-log (useCallback deps), manager-menu-item-modal (Image), pickup-time-picker (useCallback deps); build passes with no ESLint warnings for these files.

---

## Known Issues / TODOs (if any)

- The manager dashboard **page** uses `client-dashboard.tsx`, which still fetches low stock from the `items` table. The server component `dashboard-content.tsx` has been updated to use `beans` (ingredients) for Low Stock Alerts; if the page is switched to use that component (or client-dashboard is updated to query `beans`), the dashboard will show ingredient-level low stock consistently.

---

## Summary

This PR delivers CSA-214 (Modify In-Stock Quantity) and sold-out-from-ingredients on the **ingredient-based model**: stock and audit are on **beans** and **bean_stock_audit_log**, manager UI is on the Ingredients flow, customer menu uses recipe stock to set sold_out, and default coffee recipes are seeded. The relevant migrations have been applied. Tests and accessibility are updated; the branch is ready for review and merge into `dev`.
