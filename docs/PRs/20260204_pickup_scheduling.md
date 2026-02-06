# PR Description: Pickup Scheduling & Staff Schedule (CSA-201)

**Branch:** `feature/customer/pickup-scheduling`
**Author:** Filip
**Date:** 2026-02-04

---

## Objective

Enforce cafe opening hours for order pickup scheduling to prevent orders outside operational times, and provide staff with a scheduled view of upcoming orders.

---

## What Was Implemented

### 1. Opening Hours Logic

- **Utility:** Created `src/lib/opening-hours.ts` to handle opening hour checks (`isWithinOpeningHours`) and finding the next open slot.
- **Database:** Fetches `opening_hours` from the `settings` table (JSONB format).

### 2. Pickup Time Picker (Client-Side)

- Updated `PickupTimePicker` component to accept `openingHours` prop.
- Validates selected time against store hours dynamically.
- Shows error messages with specific open/close times for the selected day.

### 3. Order Validation (Server-Side)

- Updated `POST /api/orders` to validate `pickup_time` against the database `settings`.
- Returns `400 Bad Request` if the time is outside opening hours, preventing API abuse.

### 4. Staff Schedule View

- **New Page:** Created `/staff/orders/schedule` to view orders grouped by time slots (hourly).
- **Navigation:** Added a "View Schedule" link to the main staff orders queue.
- **Features:**
  - Toggle between "Today" and "Tomorrow".
  - Shows order details (customer, items, total) in a timeline view.

---

## Files Modified / Added

- `src/lib/opening-hours.ts` (New)
- `src/components/pickup-time-picker.tsx` (Modified)
- `app/checkout/page.tsx` (Modified - fetch settings)
- `app/api/orders/route.ts` (Modified - server validation)
- `app/staff/orders/schedule/page.tsx` (New)
- `app/staff/orders/page.tsx` (Modified - added link)

---

## Testing Checklist

- [x] Pickup picker shows error for times outside opening hours
- [x] Pickup picker allows valid times within opening hours
- [x] Server rejects orders with invalid pickup times (API test)
- [x] Staff schedule view correctly groups orders by hour
- [x] "Today/Tomorrow" toggle works in schedule view
- [x] Navigation from queue to schedule works

---

## Summary

This feature ensures operational compliance by enforcing opening hours and improves staff workflow with a dedicated schedule view for managing peak times.
