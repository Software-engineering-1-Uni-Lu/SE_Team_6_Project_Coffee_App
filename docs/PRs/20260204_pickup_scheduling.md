# PR Description: Pickup Scheduling (CSA-201)

**Branch:** `feature/customer/pickup-scheduling`
**Author:** Filip
**Date:** 2026-02-04

---

## Objective

Enable customers to schedule a pickup time for their orders during checkout, while strictly enforcing store operational hours and preparation time.

---

## What Was Implemented

### 1. Store Hours Enforcement

- Updated `PickupTimePicker` component to validate selected times against store hours (8:00 AM - 6:00 PM).
- Added logic to prevent selecting times outside of these hours.
- Added user feedback (error messages) when an invalid time is selected.

### 2. Validation Logic

- **Preparation Time:** Enforced a minimum 15-minute buffer from the current time.
- **Store Hours:** Enforced strict bounds (start hour inclusive, close hour exclusive).
- **Advance Booking:** Limited scheduling to within the next 7 days.

### 3. Testing

- Added `src/components/__tests__/pickup-time-picker.test.tsx` with unit tests covering:
  - Rendering.
  - Validation for times before opening (too early).
  - Validation for times after closing (too late).
  - Successful selection of valid times.

---

## Files Modified / Added

- `src/components/pickup-time-picker.tsx` (Modified)
- `src/components/__tests__/pickup-time-picker.test.tsx` (New)

---

## Testing Checklist

- [x] Try to select a time before 8:00 AM -> Error displayed
- [x] Try to select a time after 6:00 PM -> Error displayed
- [x] Try to select a time within 15 mins of now -> Error displayed
- [x] Select a valid time (e.g., 2:00 PM tomorrow) -> Success
- [x] Verify checkout form submission includes valid pickup time

---

## Summary

The pickup scheduling feature is now robust and prevents customers from placing orders for times when the store is closed or cannot fulfill the order immediately.
