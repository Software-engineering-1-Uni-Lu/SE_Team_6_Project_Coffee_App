# PR Description: Customer Loyalty Points Payment

**Branch:** `feature/customer/spend-loyalty-points`  
**Author:** Federico Newton  
**Date:** 2026-01-25

---

## Objective

Enable customers to pay for orders using loyalty points, with item-based points cost, higher redeem ratio, and clear checkout/profile UX.

---

## What Was Implemented

### 1. Loyalty points payment data flow

- Added `loyalty_points` as a payment method and a dedicated RPC to create points-paid orders atomically.
- Computed points required per item using a 5x redeem ratio and rounded up to whole euros.
- Skipped points earning on points-paid orders while preserving cancellation refunds.
- Card payments now credit points immediately after the paid order is created.

### 2. API and ledger updates

- Routed points payments through `create_loyalty_points_order` with clear error handling.
- Extended loyalty summary to return full history (earned and spent).

### 3. Customer-facing UX

- Checkout shows points balance and points required, with a loyalty payment option when eligible.
- Profile history now includes both earnings and redemptions.
- Order/payment labels now include Loyalty Points.

---

## Files Modified / Added

- supabase/migrations/20260201120000_loyalty_points_spend.sql
- supabase/migrations/20260201133000_card_points_award_on_payment.sql
- supabase/migrations/20260201150000_fix_loyalty_trigger_after_insert.sql
- app/api/orders/route.ts
- app/api/orders/**tests**/orders.test.ts
- app/api/loyalty/summary/route.ts
- app/api/loyalty/summary/**tests**/summary.test.ts
- app/api/**tests**/test-utils.ts
- app/checkout/page.tsx
- app/auth/profile/page.tsx
- app/orders/page.tsx
- app/order-confirmation/[id]/page.tsx
- app/staff/orders/page.tsx
- src/types/order.ts
- src/lib/loyalty-utils.ts
- e2e/loyalty-points-spend.spec.ts
- e2e/loyalty-points.spec.ts

---

## Testing Checklist

- [x] `npm test -- app/api/orders/__tests__/orders.test.ts app/api/loyalty/summary/__tests__/summary.test.ts`
- [x] `npx playwright test e2e/loyalty-points-spend.spec.ts --project=chromium`
- [x] `npx playwright test e2e/loyalty-points.spec.ts --project=chromium`

---

## Summary

Customers can pay with loyalty points, see real-time points requirements at checkout, and card orders now credit points immediately with full ledger tracking.
