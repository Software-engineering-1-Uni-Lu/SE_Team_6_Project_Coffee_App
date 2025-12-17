# PR Description: feat/customer-foundation/View-order-info-status

**Branch:** `feat/customer-foundation/View-order-info-status`  
**Author:** Assistant  
**Date:** 2025-12-17

---

## Objective

Deliver unified order tracking for customers and guests, including invoice downloads for any order state with clear payment/order status indicators.

---

## What Was Implemented

### 1. Orders Page & Modal Enhancements

- Added guest-visible Orders nav link and unified `/orders` page with history/guest lookup.
- Order detail modal now includes client-side invoice download (jsPDF) for all orders.

### 2. Confirmation Page Invoice Support

- Guest-friendly order confirmation: caches guest orders, allows one-click invoice download when order is present.
- Added name/email fallbacks and EUR formatting with space (“€ 0.00”); invoice generator handles unpaid labels.

### 3. API & Data Access

- `/api/orders/history` uses proper cookie-aware Supabase client and links guest orders by email for authenticated users.
- `/api/orders/lookup` (service-role) fetches guest orders by order ID + email without enumeration.

---

## Files Modified / Added

- app/orders/page.tsx
- app/order-confirmation/[id]/page.tsx
- app/api/orders/history/route.ts
- app/api/orders/lookup/route.ts
- src/components/navbar.tsx
- package.json / package-lock.json (added jspdf)

---

## Testing Checklist

- [x] `npm run lint`
- [ ] Guest checkout → confirmation redirect and invoice download
- [ ] Authenticated orders page loads history and invoice download
- [ ] Guest lookup on `/orders` (order ID + email) and invoice download
- [ ] Guest lookup on confirmation page when order not cached
- [ ] EUR formatting shows as “€ 4.20” in invoices

---

## Known Issues / TODOs (if any)

- Existing lint warnings: `<img>` in `manager-menu-item-modal.tsx` and missing dependency in `pickup-time-picker.tsx` (unchanged).
- LCP priority warning for Unsplash image (data-driven).

---

## Summary

Orders tracking is unified for customers and guests, with secure APIs, guest-friendly confirmation, and client-side invoice downloads that reflect payment/order status. Ready for review/merge.
