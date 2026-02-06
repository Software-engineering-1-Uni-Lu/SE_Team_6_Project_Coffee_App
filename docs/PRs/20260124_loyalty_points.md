# PR Description: Loyalty Points (Customer)

**Branch:** `customer/earn-loyalty-points`  
**Author:** Federico Newton  
**Date:** 2026-01-24

---

## Objective

Deliver customer-facing loyalty points accrual, history display, and verification while keeping data integrity and idempotency.

---

## What Was Implemented

### 1. Loyalty Accrual + Integrity

- Updated loyalty trigger logic to award only on completed + paid orders.
- Added idempotent ledger enforcement for earned points.
- Documented default points ratio and rounding rule.

### 2. Customer API + UI

- Added a customer-only loyalty summary API.
- Displayed points balance and earned history in the profile page.
- Added checkout estimate for points earned on the current order.

### 3. Tests

- Added API tests for loyalty summary behavior.
- Added E2E coverage for points accrual and UI display.

---

## Files Modified / Added

- supabase/migrations/20260124231948_loyalty_points_final_state.sql
- app/api/loyalty/summary/route.ts
- app/api/loyalty/summary/**tests**/summary.test.ts
- app/auth/profile/page.tsx
- e2e/loyalty-points.spec.ts

---

## Testing Checklist

- [x] `npm test -- app/api/loyalty/summary/__tests__/summary.test.ts`
- [x] `npx playwright test e2e/loyalty-points.spec.ts --project=chromium`
- [x] Manual UI check via profile page (balance + history render)
- [x] Idempotency check via reload in E2E
- [x] Error handling for API summary

---

## Summary

Loyalty points accrual and customer visibility are implemented, tested, and ready for review.
