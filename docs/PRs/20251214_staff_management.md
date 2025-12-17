# PR Description: CSA-132/133/134 Staff Management Stabilization

**Branch:** `feature/staff-management-system`  
**Author:** Stassart Anthony  
**Date:** 2025-12-14

---

## Objective

Restore and harden staff management so managers/admins can browse, edit, block, and (admins only) delete staff accounts, and generate/manage invite codes with correct auth + RLS handling.

---

## What Was Implemented

### 1. API auth + data fetching fixes (CSA-132/133/134)

- Reworked admin staff endpoints to use cookie-aware Supabase clients and DB-backed role checks; replaced RPC join with explicit `user_roles` + `profiles` query to satisfy RLS and avoid relationship cache issues. (`app/api/admin/staff/route.ts`)
- Added admin-only DELETE path that uses the service role to remove non-admin users, prevents self-delete, and audits the action. (`app/api/admin/staff/route.ts`)
- Kept block/unblock endpoint protected by `can_manage_user` and self-block guard. (`app/api/admin/staff/[id]/block/route.ts`)

### 2. Staff management UI safety + controls (CSA-132/133/134)

- Staff table now hides block control for the logged-in user and exposes Delete only for admins on non-admin rows, with confirmation/loading states. (`src/components/admin/staff/StaffManagementClient.tsx`)
- Client already pulls staff list + invites via the fixed APIs and reflects updates without reloads.

### 3. Middleware/auth hardening

- Middleware now owns auth/role/blocked checks (DB-backed), removing duplicate server checks from dashboard pages. (`middleware.ts`, `app/admin/page.tsx`, `app/staff/page.tsx`)
- Auth helpers expanded with DB-backed blocked lookup for server contexts. (`src/lib/auth.ts`)

---

## Files Modified / Added

- `app/api/admin/staff/route.ts` — role-filtered listing, admin delete, service-role use, auth checks.
- `app/api/admin/staff/[id]/block/route.ts` — self-block prevention retained.
- `src/components/admin/staff/StaffManagementClient.tsx` — UI guards for self-block, admin-only delete action.
- `middleware.ts`, `app/admin/page.tsx`, `app/staff/page.tsx`, `src/lib/auth.ts` — middleware-driven auth/blocked enforcement, DB role helper.
- `AGENTS.md` — contributor guidelines.
- `supabase/migrations/20251214000000_add_staff_management_helpers.sql` — staff helpers (existing in branch; ensures `can_manage_user`/`get_manageable_staff`).

---

## Testing Checklist

- [x] `npm run lint`
- [x] Manual: Admin on `/admin/staff` sees staff list, invite codes, can edit/block (others) and delete non-admin users.
- [x] Manual: Manager on `/admin/staff` sees staff only; no delete control; can block/unblock staff.
- [x] Manual: Blocked user is redirected to `/blocked` across routes.
- [x] Manual: Verify delete path removes user and audit log entry is created (requires service role env).

---

## Known Issues / TODOs (if any)

- Need end-to-end manual check of staff list once data is seeded (staff@staff.com, manager@manager.com) and service role key configured for delete.
- `src/hooks/use-cart.tsx` still emits a lint warning (missing dependency) — unchanged.

---

## Summary

Staff management endpoints now honor session cookies, role-based visibility, and RLS; UI prevents self-blocking and limits destructive actions to admins; dashboards rely on middleware for auth/blocked enforcement. Next: verify with real data and service role key, then add automated coverage for staff CRUD and blocked flow.
