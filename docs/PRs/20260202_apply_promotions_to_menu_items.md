# PR Description: CSA-209 Apply promotions to menu items

**Branch:** `feature/apply-promotions-to-menu-items`  
**Author:** Hedi
**Date:** 2026-02-02

---

## Objective

Implement “Apply promotions to menu items” for manager and admin: allow creating and targeting promotions (global, category, or single item), apply stacked discounts on the customer menu and at checkout, and show original price plus promotion on checkout instead of only the discounted price.

---

## What Was Implemented

### 1. Data model and promotion logic

- **Promotion type** (`src/types/promotions.ts`): `Promotion` and `DiscountType` matching `public.promotions` (id, name, description, discount_type, value_cents, percent, active, start_at, end_at, category_id, item_id).
- **Promotion helpers** (`src/lib/promotions.ts`):
  - `filterActivePromotionsByTime(promotions, now?)`: keep promotions that are active and within start_at/end_at.
  - `promotionsForItem(item, activePromotions)`: return promotions that apply to the item (by `item_id` or `category_id`); global-only promos are excluded for menu items.
  - `applyPromotionsStacked(priceCents, promos)`: apply percent discounts first, then amount; all math in cents with `Math.round`; return `{ discounted, combinedLabel }` (e.g. "10% OFF" or "-€0.50").
- **Design:** On the menu we only apply item- and category-scoped promotions. Global promotions can be created and are stored, but they do not affect menu item prices (no code change needed—this is intended).
- **Unit tests** (`src/lib/__tests__/promotions.test.ts`) for time filter, item scope, and stacking.

### 2. Customer-facing: Menu and cart

- **Menu page** (`app/menu/page.tsx`): Fetches active promotions from Supabase, filters by time; for each item computes applicable promos and stacked discounted price; shows discounted price as main, original struck through and badge (e.g. "10% OFF") when there is a discount; add-to-cart uses the discounted price and stores original as `basePrice`.
- **Checkout** (`app/checkout/page.tsx`): For each line item, when `price < basePrice` (promotion applied), shows original price (struck through), then “Promotion: -€X.XX”, then final line price. Otherwise shows only the line total as before.

### 3. Manager/Admin: Promotions UI and API

- **Promotions page** (`app/manager/promotions/page.tsx`): List all promotions (name, target, discount, active, start/end, Edit/Delete); “Add promotion” and “Edit” open a modal. Target is mutually exclusive: **All items (global)**, **Target category** (dropdown), or **Target item** (dropdown). Form: name, description, discount type (percent/amount), value, active, optional start/end. Validation: category or item required when that target is selected.
- **API**: `GET /api/promotions` and `POST /api/promotions` (list/create); `PATCH /api/promotions/[id]` and `DELETE /api/promotions/[id]` (update/delete). All require manager or admin. Create/update enforce mutually exclusive `category_id` vs `item_id`.
- **Navigation**: “Promotions” link added under Manager/Admin dropdown (navbar) pointing to `/manager/promotions`.

---

## Files Modified / Added

**New**

- `src/types/promotions.ts` – Promotion and DiscountType types.
- `src/lib/promotions.ts` – filterActivePromotionsByTime, promotionsForItem, applyPromotionsStacked.
- `src/lib/__tests__/promotions.test.ts` – Unit tests for promotion helpers.
- `app/api/promotions/route.ts` – GET (list), POST (create) for manager/admin.
- `app/api/promotions/[id]/route.ts` – PATCH, DELETE for manager/admin.
- `app/manager/promotions/page.tsx` – Manager/Admin promotions list and create/edit modal.

**Modified**

- `app/menu/page.tsx` – Fetch promotions, filter by time; per-item discounted price and badge; add-to-cart with discounted price and basePrice.
- `app/checkout/page.tsx` – Per line: show original (struck through), promotion amount, then final price when discounted.
- `src/components/navbar.tsx` – “Promotions” link in Manager/Admin dropdown.

---

## Testing Checklist

- [x] Promotion helpers: time filter, promotionsForItem (item/category/global), applyPromotionsStacked (percent then amount, rounding, combinedLabel).
- [x] Menu page: promotions fetched and filtered by time; items with applicable promos show discounted price, badge, and struck-through original; add-to-cart stores discounted price and basePrice.
- [x] Checkout: line items with discount show original, “Promotion: -€X.XX”, and final price; items without discount show single price.
- [x] Manager Promotions: list, create (global/category/item), edit, delete; target mutually exclusive; API auth (manager/admin).
- [x] Build and lint pass.

---

## Known Issues / TODOs (if any)

- Optional: E2E test for manager creating a promotion and customer seeing discount on menu/checkout.

---

## Summary

CSA-209 is implemented end-to-end: managers and admins can create and target promotions (global, category, or single item) from `/manager/promotions`; customers see stacked discounts on the menu and at checkout, with checkout showing original price and promotion applied rather than only the discounted price. Ready for review/merge.
