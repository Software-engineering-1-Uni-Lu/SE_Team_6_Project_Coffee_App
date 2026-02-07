# PR Description: Hotfix - Fix Production Deployment

**Branch:** `hotfix/deploy-prod-flag`
**Author:** Filip Zekonja
**Date:** 2026-02-07

---

## Objective

Fix broken production deployment on Vercel caused by two issues: a target environment mismatch in the deploy command, and missing dynamic route configuration for API routes that use cookies.

---

## What Was Implemented

### 1. Vercel Deploy Flag Fix

- Added `--prod` flag to `vercel deploy --prebuilt` in the production deploy workflow
- The build step used `--prod` (production target) but the deploy step was missing it, causing Vercel to reject the prebuilt output with a target environment mismatch error

### 2. Force-Dynamic on All API Routes

- Added `export const dynamic = "force-dynamic";` to all 37 API route files that use cookies or import from `supabase/server`
- Next.js was attempting to statically render these routes at build time, which fails because `cookies()` is a dynamic server feature

---

## Files Modified / Added

**Workflow:**

- `.github/workflows/deploy-prod.yml` — added `--prod` flag to deploy command

**API Routes (35 files — added `export const dynamic = "force-dynamic";`):**

- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/register/staff/route.ts`
- `app/api/auth/user/route.ts`
- `app/api/auth/delete/route.ts`
- `app/api/auth/mfa/enroll/route.ts`
- `app/api/auth/mfa/verify/route.ts`
- `app/api/admin/invites/route.ts`
- `app/api/admin/invites/[id]/route.ts`
- `app/api/admin/staff/[id]/route.ts`
- `app/api/admin/staff/[id]/block/route.ts`
- `app/api/health/route.ts`
- `app/api/ingredients/route.ts`
- `app/api/ingredients/[id]/route.ts`
- `app/api/ingredients/missing/route.ts`
- `app/api/ingredients/missing/[id]/route.ts`
- `app/api/loyalty/summary/route.ts`
- `app/api/manager/ingredients/[id]/stock/route.ts`
- `app/api/manager/ingredients/audit-log/route.ts`
- `app/api/manager/ingredients/audit-log/export/route.ts`
- `app/api/manager/ingredients/bulk-import/route.ts`
- `app/api/menu/items/route.ts`
- `app/api/menu/items/[id]/route.ts`
- `app/api/menu/upload/route.ts`
- `app/api/orders/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/orders/[id]/cancel/route.ts`
- `app/api/orders/[id]/modify/route.ts`
- `app/api/orders/history/route.ts`
- `app/api/promotions/route.ts`
- `app/api/promotions/[id]/route.ts`
- `app/api/staff/shift-notes/route.ts`
- `app/api/staff/shift-notes/[id]/route.ts`
- `app/api/webhooks/stripe/route.ts`

_(2 files already had this export: `app/api/auth/update/route.ts`, `app/api/admin/staff/route.ts`)_

---

## Testing Checklist

- [x] Pre-commit hooks (ESLint + Prettier) pass
- [x] All 37 API route files confirmed to have `force-dynamic` export
- [x] Deploy flag matches build target environment (`--prod`)
- [x] No functional changes to any route logic

---

## Summary

Two-commit hotfix to unblock production deployments on Vercel. Ready for immediate merge into `main`.
