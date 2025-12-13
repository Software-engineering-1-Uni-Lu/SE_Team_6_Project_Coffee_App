# PR Description: Complete Authentication Integration

**Branch:** `feature/auth-setup` → `dev`
**Author:** Team 6
**Date:** 2025-12-13

---

## Objective

Complete the authentication system integration by migrating from metadata-based role management to a **database-driven role system** with invite code validation. This PR delivers a production-ready authentication system with proper session handling, role-based access control, and secure staff onboarding via invite codes.

**Critical Fix (2025-12-13)**: Resolved API route session handling issues that were preventing role data from being fetched correctly, causing all users to appear as "customer" in the UI and the fact that the Invite Codes didn't work with our current implementation at the time.

---

## What Was Implemented

### 1. Database-Based Role System (Source of Truth)

**Problem**: Original implementation stored roles in `user_metadata.role`, which could be tampered with and wasn't properly validated.

**Solution**: Migrated to `user_roles` table as the authoritative source for user roles.

**Architecture**:

- Roles stored in `user_roles` table (not metadata)
- Database trigger `handle_new_user()` assigns roles during registration
- RLS policies protect role data
- Server-side `getUserRole()` function queries database

**Files**:

- `src/lib/auth.ts`: Added `getUserRole(userId)` and `getUserRoleWithCache(user)`
- `middleware.ts`: Updated to use async database-based role fetching
- `supabase/migrations/20251126020000_update_user_signup_for_invite_codes.sql`: Database trigger for role assignment

**Benefits**:

- ✅ Roles cannot be modified client-side
- ✅ Single source of truth (database)
- ✅ Supports RLS policies
- ✅ Audit trail via database logs

---

### 2. Invite Code Registration System

**Problem**: No secure way to onboard staff/manager/admin users. Public registration portal would allow anyone to claim elevated roles.

**Solution**: Split registration into two portals:

1. **Public customer registration** (`/auth/register`) - No invite code needed
2. **Invite-based staff registration** (`/auth/register/staff`) - Requires valid invite code

**How It Works**:

1. Admin creates invite code in database (via SQL or future admin UI)
2. Invite code includes: role, expiration date, single-use flag
3. New staff member registers at `/auth/register/staff` with invite code
4. Database trigger validates code and assigns role
5. Invite code is marked as "used" (prevents reuse)

**Database Schema** (`staff_invite_codes` table):

- `code`: Unique invite string (e.g., "STAFF-2025-A1B2C3")
- `role`: Role to assign (staff, manager, admin)
- `expires_at`: Expiration timestamp
- `used`: Boolean flag
- `used_by`: User ID who used the code
- `created_by`: Admin who created the code

**Current Workflow** (Invite Code Creation):

```sql
-- Admins create invite codes via SQL (for now)
INSERT INTO staff_invite_codes (code, role, expires_at, notes) VALUES
  ('STAFF-2025-A1B2C3', 'staff', NOW() + INTERVAL '30 days', 'Demo staff invite');
```

**Future Enhancement**: Admin UI at `/admin/invites` will allow managers to create staff invites and admins to create staff/manager invites.

**Files**:

- `app/api/auth/register/staff/route.ts`: Staff registration endpoint with invite validation
- `app/api/auth/register/route.ts`: Simplified customer registration (no role metadata)
- `supabase/migrations/20251126010000_add_staff_invite_codes.sql`: Invite code table and validation functions

---

### 3. API Route Session Handling Fix (CRITICAL - 2025-12-13)

**Problem Discovered**:
After implementing the database role system, the `/api/auth/user` endpoint was returning **401 Unauthorized** errors for all authenticated users. This caused:

- Profile page showing "customer" for all users
- Navbar showing customer dropdown for staff/manager/admin
- Wrong dashboard redirects (staff → `/menu` instead of `/staff`)

**Root Cause Analysis**:

1. The `/api/auth/user` endpoint was using `getCurrentUser()` from `src/lib/auth.ts`
2. `getCurrentUser()` uses the Supabase client from `src/integrations/supabase/server.ts`
3. That server client uses `getAll()`/`setAll()` cookie handlers
4. **API routes require explicit `get()`/`set()`/`remove()` cookie handlers** (different from Server Components)
5. Without proper cookie handlers, the API route couldn't read session cookies
6. Session validation failed → 401 Unauthorized

**Solution Implemented**:
Rewrote `/api/auth/user` to create its own Supabase client with proper API route cookie handling:

```typescript
// BEFORE (BROKEN):
const user = await getCurrentUser(); // Uses server.ts client

// AFTER (FIXED):
const cookieStore = await cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set(name, "", options);
      },
    },
  }
);
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
```

**Pattern Reference**: Matches `/api/auth/logout/route.ts` which was already working correctly.

**Files Modified**:

- `app/api/auth/user/route.ts`: Complete rewrite with proper cookie handling

---

### 4. Role Fetching from Database (CRITICAL - 2025-12-13)

**Second Problem Discovered**:
Even after fixing the session handling, the API was still returning `"role": "customer"` for all users.

**Root Cause**:

1. The API was calling `getUserRole(user.id)` to fetch the role
2. `getUserRole()` internally creates a NEW Supabase client using `src/integrations/supabase/server.ts`
3. That client also uses the broken `getAll`/`setAll()` pattern
4. The query to `user_roles` table failed due to RLS policies (unauthenticated context)
5. Function defaulted to "customer"

**Database Verification**:
We verified the database had the correct data:

- ✅ `user_roles` table showed `role = "staff"` for test user
- ✅ Database trigger had assigned role correctly
- ✅ Invite code was marked as used

**Solution Implemented**:
Query the `user_roles` table directly in the API route using the already-configured Supabase client:

```typescript
// BEFORE (BROKEN):
const role = await getUserRole(user.id); // Creates broken client internally

// AFTER (FIXED):
const { data: roleData, error: roleError } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .single();

const role = roleError || !roleData ? "customer" : roleData.role;
```

**Why This Works**:

- Uses the properly-authenticated Supabase client from step 3
- RLS policies allow user to read their own role
- No intermediate client creation
- Direct database query

**Files Modified**:

- `app/api/auth/user/route.ts`: Inlined role query with authenticated client

---

### 5. Supporting Updates

**Profile Page Logout Fix**:

- Changed from `router.push("/")` to `window.location.href = "/"` for proper session clearing
- File: `app/auth/profile/page.tsx`

**Dashboard Pages**:

- Updated all dashboard pages to use async `getUserRole(user.id)`
- Files: `app/admin/page.tsx`, `app/customer/page.tsx`, `app/staff/page.tsx`

**Middleware**:

- Updated to use async database-based role fetching
- File: `middleware.ts`

---

## Files Modified / Added

### Core Authentication

- `src/lib/auth.ts` - Added `getUserRole()` and `getUserRoleWithCache()`
- `app/api/auth/user/route.ts` - **CRITICAL FIX**: Complete rewrite with proper session + role handling
- `app/api/auth/register/route.ts` - Simplified customer registration
- `app/api/auth/register/staff/route.ts` - Invite-based staff registration

### Middleware & Route Protection

- `middleware.ts` - Updated to use async database role fetching

### Dashboard Pages

- `app/admin/page.tsx` - Updated role fetching
- `app/staff/page.tsx` - Updated role fetching
- `app/customer/page.tsx` - Updated role fetching
- `app/auth/profile/page.tsx` - Fixed logout behavior

### Client Hooks

- `src/hooks/useUser.ts` - Updated to fetch role via `/api/auth/user` endpoint

### Database Migrations

- `supabase/migrations/20251126010000_add_staff_invite_codes.sql` - Invite code table
- `supabase/migrations/20251126020000_update_user_signup_for_invite_codes.sql` - Database trigger

---

## Testing Checklist

### Authentication Flow

- [x] Customer can register at `/auth/register` without invite code
- [x] Staff can register at `/auth/register/staff` with valid invite code
- [x] Invalid invite code shows error and prevents registration
- [x] Expired invite code shows error
- [x] Used invite code shows error (cannot reuse)
- [x] Login works for all roles
- [x] Logout works and clears session completely

### Role Assignment & Display

- [x] Customer registration assigns "customer" role in database
- [x] Staff registration with invite code assigns correct role (staff/manager/admin)
- [x] Profile page displays correct role from database
- [x] `/api/auth/user` returns correct role (no more 401 errors)
- [x] No console errors on profile page

### Route Protection & Redirects -> Note the landings themselves are not fully supported yet due to the lack of UI

- [x] Customer login redirects to `/menu`
- [x] Staff login redirects to `/staff`
- [x] Manager login redirects to `/staff`
- [x] Admin login redirects to `/staff`
- [x] Middleware blocks unauthorized access
- [x] Dashboard pages perform secondary auth checks

### Database Integration

- [x] Roles stored in `user_roles` table (not metadata)
- [x] Database trigger validates invite codes
- [x] Database trigger assigns roles correctly
- [x] Database trigger marks invite codes as used
- [x] RLS policies allow users to read their own role

---

## What UI Team Needs to Do

The authentication system is **production-ready**. The UI team can now build role-specific features by following these integration patterns:

### 1. Accessing User Session & Role (Client Components)

Use the existing `useUser()` hook for real-time session data:

```typescript
"use client";
import { useUser } from "@/src/hooks/useUser";

export function MyComponent() {
  const { user, role, isBlocked, loading } = useUser();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  if (isBlocked) return <div>Account blocked</div>;

  // Render based on role
  return (
    <div>
      {role === "admin" && <AdminFeature />}
      {role === "staff" && <StaffFeature />}
      {role === "customer" && <CustomerFeature />}
    </div>
  );
}
```

### 2. Protecting Server Components

Use existing server-side utilities for authentication:

```typescript
// In dashboard pages or server components
import { getCurrentUser, getUserRole } from "@/src/lib/auth";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const role = await getUserRole(user.id);
  if (role !== "admin") redirect("/"); // Role check

  // Render admin-only content
}
```

### 3. Creating Role-Specific Pages

**Structure**:

```
app/
  staff/
    page.tsx          ← Staff dashboard (already exists)
    orders/           ← UI team creates
    inventory/        ← UI team creates
  admin/
    page.tsx          ← Admin dashboard (already exists)
    users/            ← UI team creates
    settings/         ← UI team creates
  customer/
    page.tsx          ← Customer dashboard (already exists)
    orders/           ← UI team creates
    cart/             ← UI team creates
```

**Middleware already protects these routes**:

- `/staff/*` → Staff, Manager, Admin only
- `/admin/*` → Manager, Admin only
- `/customer/*` → Customer only

Just create the pages - protection is automatic.

### 4. Navbar Integration (Already Done)

The navbar already uses `useUser()` and shows role-appropriate dropdowns. If you need to add new links:

```typescript
// In navbar.tsx
{role === "staff" && (
  <Link href="/staff/new-feature">New Feature</Link>
)}
```

### 5. Calling Auth APIs

For user actions (update profile, delete account, etc.), use existing API routes:

```typescript
// Update user
await fetch("/api/auth/update", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ full_name: "New Name" }),
  credentials: "include",
});

// Delete user
await fetch("/api/auth/delete", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ confirm: true }),
  credentials: "include",
});
```

### 6. Creating Invite Codes (Temporary SQL Method)

**For now**, admins create invite codes via SQL:

```sql
-- In Supabase SQL Editor
INSERT INTO staff_invite_codes (code, role, expires_at, notes) VALUES
  ('STAFF-2025-XYZ789', 'staff', NOW() + INTERVAL '30 days', 'New hire - John Doe'),
  ('MANAGER-2025-ABC123', 'manager', NOW() + INTERVAL '30 days', 'Promoted - Jane Smith');
```

**Future**: Build UI at `/admin/invites` where:

- Managers can create staff invites
- Admins can create staff/manager invites
- View all invites (used/unused/expired)
- Revoke unused invites

### 7. Key Files to Reference

**When building features, reference these files**:

- `CLAUDE.md` - Overall architecture and role-based routing
- `src/hooks/useUser.ts` - How session management works
- `src/lib/auth.ts` - Available server-side auth utilities
- `middleware.ts` - Route protection rules
- `app/auth/profile/page.tsx` - Example of form handling with auth APIs

### 8. DO NOT Modify (Security-Critical)

⛔ **Never change these without team review**:

- `middleware.ts` - Route protection
- `src/lib/auth.ts` - Auth utilities
- `app/api/auth/**` - Auth API routes
- Database trigger functions

✅ **Safe to modify**:

- Dashboard page content
- UI components
- Navigation styling
- Role-specific features

---

## Known Issues / TODOs

### Immediate (P0)

- None - All critical issues resolved

### High Priority (P1)

- [ ] **Admin UI for invite codes** - Build `/admin/invites` page for creating/managing invite codes
  - Currently: Admins create codes via SQL
  - Future: Web UI with form, expiration picker, role selector
  - Access: Managers (staff invites only), Admins (all roles)

### Medium Priority (P2)

- [ ] **Dashboard content** - Staff/Manager/Admin dashboards are scaffolds, need feature implementation
- [ ] **Email verification** - Add email confirmation flow during registration
- [ ] **Password reset** - Add forgot password functionality
- [ ] **Route naming standardization** - Some UI routes use `/manager/*`, RBAC uses `/admin/*` (document which is canonical)

### Low Priority (P3)

- [ ] **Granular permissions** - Differentiate manager vs admin permissions within features (currently both have same dashboard access)
- [ ] **Invite analytics** - Track invite usage metrics (conversion rate, time to first login, etc.)
- [ ] **Email invites** - Email invite codes to new staff instead of manual sharing

---

## Summary

This PR delivers a **production-ready authentication system** with database-driven role management, secure invite-based staff onboarding, and proper API route session handling.

**Critical fixes on 2025-12-13** resolved session validation issues that were preventing role data from being displayed correctly in the UI. All users now see their proper role in the profile page, navbar, and throughout the application.

The authentication scaffold is **complete and verified**. The UI team can now:

1. Build role-specific dashboard features using `useUser()` hook
2. Create protected pages (middleware already handles access control)
3. Call existing auth APIs for user management
4. Leverage the database-backed role system for secure RBAC

All 10 original authentication user stories remain satisfied. The system is ready for feature development.

**Ready for review and merge to `dev`.**
