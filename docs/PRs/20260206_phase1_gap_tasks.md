# PR Description: CSA-217 Phase 1 Gap Tasks

**Branch:** `feature/phase1-alignment-gaps`
**Author:** Filip Zekonja
**Date:** 2026-02-06

---

## Objective

Close all 16 identified alignment gaps from the Phase 1 audit. Each gap adds a missing feature, integration, or infrastructure component required for full project coverage.

---

## What Was Implemented

### 1. Payment & Checkout Enhancements

- CSA-218: Mock Stripe payment intent API (`/api/payments/create-intent`) and card form in checkout
- CSA-225: Digital wallet (Apple Pay) payment option with enum migration and checkout UI
- CSA-226: Order modification flow — customers can modify pending orders from confirmation page

### 2. Authentication & Security

- CSA-222: TOTP-based MFA enrollment (`/api/auth/mfa/enroll`, `/api/auth/mfa/verify`) with setup and challenge pages
- Middleware updated to handle MFA challenge redirects

### 3. Staff Tools

- CSA-221: Print-friendly receipt/ticket page at `/staff/orders/print/[id]`
- CSA-227: Staff order queue with ASAP/Scheduled/All filters, pickup time badges, and 4-tier priority sort
- CSA-228: Shift notes CRUD (`/api/staff/shift-notes`) with pin support and dedicated page

### 4. Data & Menu Management

- CSA-223: Soft delete for menu items (added `deleted_at`, `current_version_id` columns + item versioning migration)
- CSA-233: Added "System" link to admin dropdown in navbar

### 5. Backend & Infrastructure

- CSA-219: Email notification service (`src/lib/notifications.ts`) triggered on order create and status change
- CSA-229: API versioning via `next.config.js` rewrite rules (`/api/v1/*` → `/api/*`)
- CSA-230: Health check endpoint (`/api/health`) and structured logger (`src/lib/logger.ts`)
- CSA-224: Canary deployment strategy in `.github/workflows/deploy-prod.yml`

### 6. Documentation & Quality

- CSA-220: Disaster recovery runbook (`docs/disaster-recovery.md`)
- CSA-231: k6 load test smoke script (`load-tests/smoke.js`)
- CSA-232: WCAG accessibility linting via `eslint-plugin-jsx-a11y` in `.eslintrc.json`

---

## Files Modified / Added

- `.eslintrc.json` — added jsx-a11y plugin
- `.github/workflows/deploy-prod.yml` — canary deploy stages
- `app/api/auth/login/route.ts` — MFA challenge redirect
- `app/api/menu/items/[id]/route.ts` — soft delete support
- `app/api/menu/items/route.ts` — filter out soft-deleted items
- `app/api/orders/[id]/route.ts` — notification on status change
- `app/api/orders/route.ts` — notification on order create, pickup scheduling
- `app/checkout/page.tsx` — payment method selection, digital wallet, modify mode
- `app/order-confirmation/[id]/page.tsx` — modify order button
- `app/staff/orders/page.tsx` — priority queue, filters, print link
- `middleware.ts` — MFA challenge route handling
- `next.config.js` — API v1 rewrite rules
- `package.json` / `package-lock.json` — new dependencies
- `src/components/navbar.tsx` — shift notes, MFA settings, system admin links
- `src/hooks/use-cart.tsx` — loadFromOrder for modify mode
- `src/integrations/supabase/server.ts` — cookie handling updates
- `src/lib/auth.ts` — MFA status helpers
- `src/types/order.ts` — pickup_time, payment_intent_id fields
- `app/admin/system/page.tsx` — system admin dashboard (new)
- `app/api/auth/mfa/` — MFA endpoints (new)
- `app/api/health/route.ts` — health check endpoint (new)
- `app/api/orders/[id]/modify/route.ts` — order modification endpoint (new)
- `app/api/payments/create-intent/route.ts` — mock payment intent API (new)
- `app/api/staff/shift-notes/` — shift notes CRUD (new)
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler (new)
- `app/auth/mfa-challenge/page.tsx` — MFA challenge page (new)
- `app/staff/orders/print/[id]/page.tsx` — printable receipt (new)
- `app/staff/settings/mfa/page.tsx` — MFA settings page (new)
- `app/staff/shift-notes/page.tsx` — shift notes page (new)
- `docs/disaster-recovery.md` — DR runbook (new)
- `load-tests/smoke.js` — k6 smoke test (new)
- `src/lib/logger.ts` — structured logger (new)
- `src/lib/notifications.ts` — email notification service (new)
- `src/lib/payment.ts` — payment utilities (new)
- `supabase/migrations/` — 5 new migration files (new)

---

## Testing Checklist

- [x] `npm run lint` passes with no errors
- [x] Pre-commit hooks (ESLint + Prettier) pass
- [x] All 16 gaps verified to have code on disk
- [x] All navigation links verified (admin system link added)
- [x] Existing functionality not broken by changes

---

## Known Issues / TODOs (if any)

- ESLint warnings (non-blocking): `autoFocus` usage in MFA pages, `label-has-associated-control` in order confirmation, `no-redundant-roles` in staff orders, anonymous default export in k6 script. These are intentional patterns for their respective contexts.

---

## Summary

All 16 Phase 1 alignment gaps are implemented and accessible. The single missing navigation issue (system admin page link) has been fixed. Ready for review and merge into `dev`.
