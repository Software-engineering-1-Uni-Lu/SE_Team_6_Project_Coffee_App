# PR Description: hotfix/restore-copy-order-id-button

**Branch:** `hotfix/restore-copy-order-id-button`  
**Author:** Zekonja Filip
**Date:** 2025-12-17

---

## Objective

Restore the order confirmation “Copy” button so guests and authenticated users can copy the full order ID while still displaying the truncated ID.

---

## What Was Implemented

### 1. Confirmation Page Copy Control

- Re-added a copy-to-clipboard button beside the truncated order ID on the order confirmation page, copying the full order ID.

---

## Files Modified / Added

- app/order-confirmation/[id]/page.tsx

---

## Testing Checklist

- [ ] `npm run lint`
- [ ] Manual: order confirmation page shows truncated ID with “Copy” button
- [ ] Manual: clicking “Copy” copies full order ID to clipboard (guest)
- [ ] Manual: clicking “Copy” copies full order ID to clipboard (authenticated)
- [ ] Manual: no regressions in order summary rendering

---

## Known Issues / TODOs (if any)

- Existing lint warnings: `<img>` in `manager-menu-item-modal.tsx` and missing dependency in `pickup-time-picker.tsx` (unchanged).

---

## Summary

Copy functionality for order IDs on the confirmation page is restored for all users. Ready for review/merge.
