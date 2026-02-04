# PR Description: Cancel Order Within Grace Period (CSA-202)

**Branch:** `feature/customer/cancel-order-grace-period`
**Author:** Filip
**Date:** 2026-02-04

---

## Objective

Allow customers to cancel their own orders within a specific grace period (default 5 minutes) after placement, provided the order is still pending.

---

## What Was Implemented

### 1. Database & Settings

- **Migration:** Added `cancellation_grace_period_minutes` to the `settings` table (default: 5 minutes).
- This allows admins to configure the grace period dynamically without code changes.

### 2. Cancel Order API

- **Endpoint:** `POST /api/orders/[id]/cancel`
- **Logic:**
  - Authenticates the user.
  - Verifies ownership (customer matches).
  - Checks if order status is 'pending'.
  - Checks if `created_at` is within the grace period defined in settings.
  - Updates status to 'cancelled' if all checks pass.

### 3. Grace Period Hook

- **Hook:** `useGracePeriod` handles the countdown logic.
- Fetches the grace period setting from the database.
- Provides `canCancel`, `remainingSeconds`, and `loading` state to UI components.

### 4. User Interface

- **Order Confirmation:** Added a prominent "Cancel Order" section with a live countdown timer.
- **Orders History:** Added a "Cancel Order" button to the order detail modal.
- **Feedback:** Toast notifications for success/error and banner for cancelled status.

---

## Files Modified / Added

- `supabase/migrations/20260204_add_cancellation_grace_period.sql` (New)
- `app/api/orders/[id]/cancel/route.ts` (New)
- `src/hooks/useGracePeriod.ts` (New)
- `app/order-confirmation/[id]/page.tsx` (Modified)
- `app/orders/page.tsx` (Modified)

---

## Testing Checklist

- [x] Cancel button appears on new orders
- [x] Countdown timer works and updates every second
- [x] Clicking cancel updates order status to 'cancelled'
- [x] Cancel button disappears after grace period expires
- [x] API rejects cancellation requests after grace period (server-side check)
- [x] Only order owner can cancel
- [x] Cancelled orders show appropriate status banner

---

## Summary

This feature empowers customers to correct mistakes immediately after ordering, reducing staff workload for accidental orders while maintaining operational stability with a time limit.
