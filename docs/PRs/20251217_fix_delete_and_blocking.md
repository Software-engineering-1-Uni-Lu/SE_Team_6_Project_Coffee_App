# PR Description: Critical Fixes for Account Deletion and User Blocking

**Branch:** `fix/blocked-delete-features`
**Author:** Anthony Stassart
**Date:** December 17, 2025

---

## Objective

Fix critical bugs preventing account deletion and user blocking functionality from working correctly. These bugs affected both customer self-deletion (CSA-43) and admin staff management capabilities (CSA-134).

---

## What Was Implemented

### 1. Fixed Account Deletion Functionality

**Root Cause:** DELETE handler was in the wrong file location, causing 405 Method Not Allowed errors.

**Issues Fixed:**

- Customer delete account API returned 401 "Not authenticated" error
- Admin delete staff account failed silently
- DELETE requests to `/api/admin/staff/[id]` returned 405 Method Not Allowed

**Solution:**

- Moved DELETE handler from `app/api/admin/staff/route.ts` (non-dynamic route) to `app/api/admin/staff/[id]/route.ts` (dynamic route with `params.id`)
- DELETE endpoint now properly receives the user ID parameter
- Both customer self-deletion and admin staff deletion now work correctly

### 2. Fixed Blocked User Status Detection

**Root Cause:** Blocked status was being read from `user.user_metadata.blocked` which was never updated, instead of the database source of truth (`profiles.blocked` column).

**Issues Fixed:**

- Client-side components showed incorrect blocked status
- `useUser` hook returned `isBlocked: false` even for blocked users
- UI didn't reflect actual blocked state from database

**Solution:**

- Updated `/app/api/auth/user/route.ts` to use `isBlockedFromDB(user.id)` instead of `isBlocked(user)`
- Modified `useUser` hook to fetch blocked status from API (which queries database)
- Removed dependency on incorrect `isBlocked()` function from `auth-utils.ts` in client code
- Middleware already correctly queried database, so redirect functionality was working

### 3. Fixed API Route Cookie Handling

**Root Cause:** Customer delete account route used `getCurrentUser()` which didn't have proper cookie configuration for Next.js 14+ API routes.

**Issues Fixed:**

- Session cookies not being read properly in `/api/auth/delete` endpoint
- API route couldn't authenticate logged-in users

**Solution:**

- Replaced `getCurrentUser()` with explicit cookie handling using `createServerClient` from `@supabase/ssr`
- Implemented proper cookie get/set/remove handlers for API route context
- Added service role key validation with clear error message
- Pattern now matches all other working API routes in the codebase

### 4. Fixed Staff Management Navigation

**Root Cause:** Navigation links pointed to deprecated `/manager/staff-management` route that doesn't exist.

**Issues Fixed:**

- "Staff Management" links in navbar and dashboard returned 404
- Users couldn't access staff management interface

**Solution:**

- Updated all "Staff Management" links to point to `/admin/staff`
- Fixed 3 occurrences across navbar and manager dashboard
- All staff management functionality now accessible

---

## Files Modified / Added

### API Routes Modified

- `app/api/admin/staff/route.ts` - Removed misplaced DELETE handler
- `app/api/admin/staff/[id]/route.ts` - Added DELETE handler, updated documentation
- `app/api/auth/delete/route.ts` - Replaced authentication method with proper cookie handling
- `app/api/auth/user/route.ts` - Changed from metadata check to database query for blocked status

### Hooks Modified

- `src/hooks/useUser.ts` - Added blocked state variable, fetch from API instead of user_metadata

### Components Modified

- `src/components/navbar.tsx` - Updated Staff Management link from `/manager/staff-management` to `/admin/staff`
- `app/manager/dashboard/dashboard-content.tsx` - Updated 2 Staff Management links to `/admin/staff`

---

## Technical Details

### Supabase Service Role Key Requirement

- **Required for user deletion**: Supabase Auth security requires Admin API with service role key to delete users
- Added validation: Returns 500 error if `SUPABASE_SERVICE_ROLE_KEY` is not configured
- Documentation updated to clarify this requirement

### Cookie Handling Pattern

All API routes now use consistent cookie handling:

```typescript
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
```

### Database as Source of Truth

- Blocked status: `profiles.blocked` column (not `user_metadata.blocked`)
- User roles: `user_roles` table (not `user_metadata.role`)
- Both middleware and API routes now consistently query database

---

## Testing Checklist

- [x] Customer can delete their own account via `/api/auth/delete`
- [x] Admin can delete staff accounts via `/api/admin/staff/[id]`
- [x] Admin can delete manager accounts via `/api/admin/staff/[id]`
- [x] Admin cannot delete other admin accounts (security check)
- [x] Admin cannot delete own account via staff management
- [x] Blocked users are redirected to `/blocked` page by middleware
- [x] Client UI correctly displays blocked status from database
- [x] `useUser` hook returns accurate blocked status
- [x] Staff Management links navigate to `/admin/staff`
- [x] No old `/manager/staff-management` routes remain in code
- [x] Service role key validation returns clear error if missing
- [x] ESLint passes (no new warnings)
- [x] TypeScript compiles successfully

---

## Security Improvements

1. **Service Role Key Validation**: Explicit check with clear error message prevents silent failures
2. **Consistent Cookie Handling**: All API routes now use secure, explicit cookie management
3. **Database Source of Truth**: Blocked status and roles always fetched from database, not client-tamperable metadata
4. **Defense in Depth**: Both middleware and page-level checks for blocked status
5. **Audit Logging**: Delete operations logged to `audit_log` table with actor information

---

## Breaking Changes

None. These are bug fixes that restore intended functionality.

---

## Environment Variables Required

```bash
# Required for account deletion functionality
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get from: Supabase Dashboard → Settings → API → "service_role" key

---

## Summary

All critical delete and blocking functionality is now working correctly. Customer account deletion, admin staff management, and user blocking now behave as intended. Navigation has been updated to remove deprecated routes. Ready for review and merge.
