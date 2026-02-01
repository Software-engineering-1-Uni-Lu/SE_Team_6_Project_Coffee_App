# PR Description: Post-Presentation Bug Fixes

**Branch:** `fix/post-presentation-fixes`
**Author:** Eric Damian
**Date:** 2026-02-01

---

## Objective

Fix critical bugs and UX issues identified after the presentation, including customer name handling, contact information updates, checkout validation, and order lookup issues.

---

## What Was Implemented

### 1. Customer Name Feature

- **Added customer name to signup form**: Implemented full name field in registration with validation.
- **Updated registration API**: Added name validation and profile table updates to store customer names.
- **Updated profile display**: Changed checkout and other pages to display customer name instead of email.
- **Comprehensive test coverage**: Updated all 15 registration API tests to include name field validation.

### 2. Editable Contact Information at Checkout

- **Added editable contact fields for authenticated users**: Replaced static "Ordering as: [name]" with editable name and email fields.
- **Support for ordering on behalf of others**: Pre-populated fields allow users to change contact info (e.g., ordering for a friend).
- **Updated order data structure**: Modified to store custom contact info in `guest_name` and `guest_email` fields for all orders.
- **Fixed API order creation**: Changed `/api/orders` route to always save contact information regardless of authentication status.

### 3. Order Display & Contact Information

- **Fixed order confirmation page**: Added display of customer name and contact email from order data.
- **Updated guest order badge logic**: Changed from checking `guest_name` to checking `customer_id === null` to correctly identify true guest orders.
- **Fixed order history pages**: Updated customer orders page and staff orders page to show correct guest badges.
- **Improved helper functions**: Ensured `getOrderCustomerName()` and `getOrderCustomerEmail()` properly prioritize order contact info over profile data.

### 4. Checkout UX Improvements

- **Updated card number placeholder**: Changed to valid test card `4242 4242 4242 4242`.
- **Updated expiry placeholder**: Changed from generic `MM/YY` to example `12/27` showing future date.
- **Added helpful validation hints**:
  - Card Number: "16 digits required. Test: 4242 4242 4242 4242"
  - Expiry: "Format: MM/YY (future date)"
  - CVC: "3 digits on back of card"
- **Maintained card validation**: Kept 16-digit requirement, expiry validation, and 3-digit CVC checks.

### 5. Order Lookup Privacy Fix

- **Fixed security vulnerability**: Changed guest order lookup API to return only the specific requested order instead of all orders with that email.
- **Improved privacy**: Users can no longer discover order history by providing a single valid order ID.
- **Updated tests**: Modified all 13 lookup API tests to reflect new single-order behavior.

---

## Files Modified / Added

### Authentication & Registration

- `app/auth/register/page.tsx` - Added customer name field
- `app/api/auth/register/route.ts` - Added name validation and profile update
- `app/api/auth/__tests__/register.test.ts` - Updated all 15 tests for name field

### Checkout & Orders

- `app/checkout/page.tsx` - Added editable contact fields, updated placeholders and hints
- `app/api/orders/route.ts` - Fixed order data to store contact info for all orders
- `app/order-confirmation/[id]/page.tsx` - Added contact info display
- `app/orders/page.tsx` - Fixed guest badge logic (3 occurrences)
- `app/staff/orders/page.tsx` - Fixed guest badge logic (2 occurrences)

### Order Lookup

- `app/api/orders/lookup/route.ts` - Fixed to return single order only
- `app/api/orders/lookup/__tests__/lookup.test.ts` - Updated all tests for new behavior

---

## Testing Checklist

- [x] Cart modal tests updated and passing (2 tests)
- [x] Registration API tests passing (15 tests)
- [x] Order lookup API tests passing (13 tests)
- [x] Manual testing: Customer name displays in checkout and order confirmation
- [x] Manual testing: Contact info editable at checkout for authenticated users
- [x] Manual testing: Guest badge only shows for true guest orders (customer_id === null)
- [x] Manual testing: Card validation working with updated placeholders
- [x] Manual testing: Order lookup returns only requested order

---

## Known Issues / TODOs

None - all identified issues have been resolved.

---

## Breaking Changes

### Database Schema

- The `guest_name` and `guest_email` fields in the `orders` table now serve a dual purpose:
  - For guest orders: Store guest contact information (as before)
  - For authenticated orders: Store custom contact information (new behavior)
- The `customer_id` field is now the authoritative indicator of whether an order is a guest order (`null` = guest)

### API Response Changes

- `/api/orders/lookup` now returns an array with a single order instead of all orders matching the email
- Frontend code already compatible (expects array format)

---

## Migration Notes

### For Existing Orders

- Old authenticated orders without `guest_name`/`guest_email` will fall back to displaying the user's profile name/email (backward compatible)
- New orders will store the contact information provided at checkout

### For Order Display Logic

- All "Guest order" badges now check `!order.customer_id` instead of `order.guest_name`
- This correctly identifies guest orders regardless of contact info presence

---

## Summary

This PR addresses critical post-presentation bugs including missing customer names, inflexible checkout contact information, confusing guest order badges, poor checkout UX, and a privacy vulnerability in order lookup. All changes are tested, backward compatible, and ready for review/merge.
