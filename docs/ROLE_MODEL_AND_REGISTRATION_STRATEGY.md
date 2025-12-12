# Role Model and Registration Strategy

**Date**: 2025-12-12
**Status**: ✅ Implemented
**Version**: 2.0

---

## Overview

This document explains Café Aroma's four-role authentication model and dual-registration portal strategy. These changes extend the existing authentication scaffold while preserving all original user stories and security guarantees.

---

## Role Model

### Four Roles

The application now supports four distinct roles:

| Role         | Access Level            | Dashboard          | Registration       |
| ------------ | ----------------------- | ------------------ | ------------------ |
| **customer** | Customer features only  | `/menu`            | Public portal      |
| **staff**    | Operational features    | `/staff`           | Invite-only portal |
| **manager**  | Management + operations | `/staff` (primary) | Invite-only portal |
| **admin**    | Full system access      | `/staff` (primary) | Invite-only portal |

### Why Manager Exists

The `manager` role was added to create a separation between:

- **Operational staff**: Process orders, manage prep station
- **Management**: Oversee operations, manage staff, configure menu
- **System administrators**: Full access including user management and system settings

**Key distinction**: Manager and admin have the same **dashboard access** but different **permission levels within features**. Permission enforcement happens at the feature level (future work), not at the routing level.

### Role Hierarchy

```
customer (least access)
   ↓
staff (operational access)
   ↓
manager (management + operational access)
   ↓
admin (full system access)
```

**Dashboard mapping**:

- Customer → `/menu` (browse and order)
- Staff/Manager/Admin → `/staff` (operational/management dashboard)

**Route access**:

- Customer: Can access `/menu`, `/customer/*` (if exists)
- Staff: Can access `/staff/*`
- Manager: Can access `/staff/*` and `/admin/*`
- Admin: Can access `/staff/*` and `/admin/*`

---

## Registration Strategy

### Two Portals

We split registration into two separate portals to enforce role security:

#### 1. Customer Registration Portal

**Route**: `/auth/register`

**Purpose**: Public registration for customers

**Characteristics**:

- ✅ Publicly accessible
- ✅ No role selector
- ✅ No invite code required
- ✅ Role is FORCED to "customer" server-side
- ✅ Any role parameter sent by client is IGNORED

**API**: `POST /api/auth/register`

**Security**:

```typescript
// Client cannot override role
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: "customer", // Always customer - hardcoded
    },
  },
});
```

#### 2. Staff Registration Portal

**Route**: `/auth/register/staff`

**Purpose**: Invite-based registration for staff, manager, and admin

**Characteristics**:

- ✅ Requires valid invite code
- ✅ Role is derived FROM THE INVITE CODE (not user input)
- ✅ No role selector visible to user
- ✅ Invite codes are single-use
- ✅ Invite codes have expiration dates

**API**: `POST /api/auth/register/staff`

**Security**:

```typescript
// 1. Validate invite code
const role = await validateInviteCode(inviteCode);

// 2. Extract role from invite (server-controlled)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role, // Role from invite code - user cannot choose
    },
  },
});

// 3. Mark invite as used (prevents reuse)
await markInviteUsed(inviteCode, data.user.id);
```

### Why Split Registration?

**Security reasons**:

1. **Prevents Role Elevation**: Users cannot register as staff/manager/admin without authorization
2. **Invite-Based Onboarding**: New staff must be invited by existing admins/managers
3. **Audit Trail**: Every staff account has an associated invite code and creator
4. **Single Use**: Invite codes can only be used once, preventing unauthorized distribution
5. **Time-Limited**: Invite codes expire, reducing risk of compromised codes

**Operational reasons**:

1. **Clear Separation**: Customers vs. staff registration flows are completely separate
2. **Simplified UX**: Customers don't see confusing role selectors
3. **Compliance**: Organizations can track who invited whom and when

---

## Invite Code System

### Database Schema

Located at: `docs/database/staff_invite_codes_schema.sql`

**Table**: `staff_invite_codes`

| Column       | Type        | Description                                            |
| ------------ | ----------- | ------------------------------------------------------ |
| `id`         | UUID        | Primary key                                            |
| `code`       | TEXT        | Unique invite code (e.g., "STAFF-2024-ABC123")         |
| `role`       | TEXT        | Role granted: 'staff', 'manager', or 'admin'           |
| `created_by` | UUID        | Admin/manager who created this invite                  |
| `created_at` | TIMESTAMPTZ | When invite was created                                |
| `expires_at` | TIMESTAMPTZ | When invite expires                                    |
| `used`       | BOOLEAN     | Whether invite has been used                           |
| `used_by`    | UUID        | User who used this invite (if used)                    |
| `used_at`    | TIMESTAMPTZ | When invite was used                                   |
| `notes`      | TEXT        | Optional notes (e.g., "For new morning shift manager") |

### How Invite Codes Work

**Registration Flow**:

1. User navigates to `/auth/register/staff`
2. User enters email, password, and **invite code**
3. API validates invite code:
   - Does it exist?
   - Is it expired?
   - Has it been used already?
4. API extracts **role** from valid invite
5. API creates Supabase user with that role in metadata
6. API marks invite as **used** (prevents reuse)
7. User is logged in and redirected to appropriate dashboard

**Code Validation**:

```typescript
async function validateInviteCode(inviteCode: string): Promise<string | null> {
  const { data } = await supabase
    .from("staff_invite_codes")
    .select("role, used, expires_at")
    .eq("code", inviteCode)
    .single();

  if (!data || data.used || new Date(data.expires_at) < new Date()) {
    return null; // Invalid
  }

  return data.role; // Valid - return role
}
```

### Creating Invite Codes

**Current State**: Invite codes must be created manually via database or SQL.

**Sample Codes** (for testing):

```sql
INSERT INTO staff_invite_codes (code, role, expires_at, notes) VALUES
  ('STAFF-DEMO-2024', 'staff', NOW() + INTERVAL '30 days', 'Demo staff invite'),
  ('MANAGER-DEMO-2024', 'manager', NOW() + INTERVAL '30 days', 'Demo manager invite'),
  ('ADMIN-DEMO-2024', 'admin', NOW() + INTERVAL '30 days', 'Demo admin invite');
```

**Future Enhancement**: Admin UI for creating/managing invite codes (out of scope for initial implementation).

---

## Post-Login Redirects

### Updated Redirect Logic

After successful login or registration, users are redirected based on role:

| Role         | Redirect To | Reason                       |
| ------------ | ----------- | ---------------------------- |
| **customer** | `/menu`     | Browse menu and place orders |
| **staff**    | `/staff`    | Access operational dashboard |
| **manager**  | `/staff`    | Access management dashboard  |
| **admin**    | `/staff`    | Access full dashboard        |

**Key Change**: Manager and admin now redirect to `/staff` instead of `/admin`. The `/staff` dashboard is the primary entry point for all operational/management users.

**Implementation**: Handled by middleware (`middleware.ts` lines 266-272):

```typescript
if (role === "staff" || role === "manager" || role === "admin") {
  url.pathname = "/staff"; // All non-customer roles
} else {
  url.pathname = "/menu"; // Customers
}
```

---

## Route Protection

### Middleware Rules

Updated rules in `middleware.ts`:

**`/staff` routes** (operational dashboard):

- ✅ Staff can access
- ✅ Manager can access
- ✅ Admin can access
- ❌ Customer redirected to `/menu`

**`/admin` routes** (management features):

- ❌ Staff redirected to `/staff`
- ✅ Manager can access
- ✅ Admin can access
- ❌ Customer redirected to `/menu`

**`/customer` routes** (if they exist):

- ✅ Customer can access
- ❌ Staff redirected to `/staff`
- ❌ Manager redirected to `/staff`
- ❌ Admin redirected to `/staff`

**`/menu` route** (public):

- ✅ Everyone can access (public route)

---

## User Stories - Verification

All original user stories remain satisfied:

### ✅ CSA-13: Register for an Account

**Implementation**: `/auth/register` (customer portal)

**Status**: ✅ Satisfied

- Public registration portal exists
- No barriers to customer registration
- Simple email + password form

### ✅ CSA-19: Staff/Admin Signup

**Implementation**: `/auth/register/staff` (invite-based portal)

**Status**: ✅ Satisfied (improved security)

- Staff/manager/admin must use invite codes
- Prevents unauthorized role assignment
- Admin creates invite codes (manual process initially)

### ✅ CSA-24: Log In to Account

**Implementation**: `/auth/login`

**Status**: ✅ Satisfied

- Single login portal for all roles
- Middleware handles role-based redirect after login

### ✅ CSA-29: Log Out of Account

**Implementation**: Logout button in navbar + `/api/auth/logout`

**Status**: ✅ Satisfied

- All roles can log out
- Session properly cleared

### ✅ CSA-33: View Account Details

**Implementation**: `/auth/profile` + `/api/auth/user`

**Status**: ✅ Satisfied

- All roles can view their account
- Role displayed correctly

### ✅ CSA-38: Modify Account Details

**Implementation**: `/auth/profile` + `/api/auth/update`

**Status**: ✅ Satisfied

- All roles can update email/password
- Role modification requires admin privileges (enforced in API)

### ✅ CSA-43: Delete Account

**Implementation**: `/auth/profile` + `/api/auth/delete`

**Status**: ✅ Satisfied

- All roles can delete their account
- Uses Supabase Admin API for permanent deletion

### ✅ CSA-48: Role-Based Access / Dashboard Redirect

**Implementation**: Middleware + role checks in dashboards

**Status**: ✅ Satisfied (enhanced with manager role)

- Four roles now supported
- Middleware enforces route protection
- Manager has access to both `/staff` and `/admin` routes
- Customers isolated to `/menu`

### ✅ CSA-53: Persistent Session

**Implementation**: `useUser` hook + Supabase session management

**Status**: ✅ Satisfied

- Sessions persist across page reloads
- Real-time auth state updates via Supabase listener

### ✅ CSA-57: Blocked User Handling

**Implementation**: Middleware checks `user_metadata.blocked` + `/blocked` page

**Status**: ✅ Satisfied

- Blocked users redirected to `/blocked` page on every request
- Cannot access any feature except logout

---

## For UI Developers

### DO NOT MODIFY

These components handle **security-critical logic** and must NOT be changed without review:

1. **`middleware.ts`**: Route protection and RBAC enforcement
2. **`src/lib/auth-utils.ts`**: Role extraction and validation
3. **`app/api/auth/register/route.ts`**: Customer registration (forces customer role)
4. **`app/api/auth/register/staff/route.ts`**: Staff registration (validates invite codes)

### Safe to Modify

These components handle **UI/UX only** and can be customized:

1. **`app/auth/register/page.tsx`**: Customer registration form (styling, layout)
2. **`app/auth/register/staff/page.tsx`**: Staff registration form (styling, layout)
3. **`app/auth/login/page.tsx`**: Login form (styling, layout)
4. **`src/components/navbar.tsx`**: Navigation UI (as long as role checks remain)

### Role Logic Locations

**Where role logic lives**:

- `src/lib/auth-utils.ts`: Client-safe utilities (`getUserRole`, `isBlocked`, `isValidRole`)
- `src/lib/auth.ts`: Server-only utilities (`getCurrentUser`, `requireRole`)
- `middleware.ts`: Route protection based on role
- `src/hooks/useUser.ts`: Client hook for getting current user + role

**DO NOT**:

- ❌ Re-implement role extraction in UI components
- ❌ Trust role from client-side state alone
- ❌ Skip server-side role checks
- ❌ Allow role selection in registration forms

**DO**:

- ✅ Import `getUserRole` from `auth-utils.ts`
- ✅ Use `useUser()` hook in client components
- ✅ Use `getCurrentUser()` in server components
- ✅ Always enforce server-side checks

### UI Routes Reference

**Public Routes**:

- `/` - Homepage
- `/menu` - Menu browsing (all users)
- `/auth/login` - Login
- `/auth/register` - Customer registration (public)
- `/auth/register/staff` - Staff registration (invite-only)

**Protected Routes**:

- `/auth/profile` - Profile management (all authenticated users)
- `/staff/*` - Operational/management dashboard (staff, manager, admin)
- `/admin/*` - Management features (manager, admin)
- `/customer/*` - Customer features (customers only)

**Special Routes**:

- `/blocked` - Blocked user notification (blocked users only)

---

## Security Implications

### Strengths

1. **Server-Side Role Control**: Roles are set server-side, never from client input
2. **Invite-Based Onboarding**: Staff can only be added by existing admins/managers
3. **Single-Use Codes**: Prevents unauthorized invite code sharing
4. **Time-Limited Invites**: Expired codes cannot be used
5. **Defense in Depth**: Middleware + page-level checks
6. **Audit Trail**: All invites tracked (who created, who used, when)

### Considerations

1. **Invite Code Distribution**: Currently manual - admins must create codes via SQL
   - **Future**: Build admin UI for creating/sending invites
   - **Mitigation**: Document SQL commands clearly

2. **Role Permissions**: Manager vs. admin permissions not yet differentiated at feature level
   - **Current**: Both have same dashboard access
   - **Future**: Implement granular permission checks within features
   - **Mitigation**: Architecture supports future permission system

3. **Invite Code Storage**: Codes stored in plain text in database
   - **Risk**: Low - codes are single-use and time-limited
   - **Future**: Consider hashing codes if needed
   - **Mitigation**: Codes auto-expire, become invalid after use

---

## Migration Notes

### From Previous Version

**Breaking Changes**: None

**Additions**:

- New `manager` role
- New `/auth/register/staff` route
- New `/api/auth/register/staff` endpoint
- New `staff_invite_codes` table

**Modifications**:

- `/auth/register` now forces customer role (removes role selector)
- Middleware redirects updated (manager → `/staff`, not `/admin`)
- Navbar shows manager role appropriately

**Backwards Compatibility**:

- Existing customer/staff/admin users unaffected
- All existing API routes unchanged
- All existing user stories still satisfied

### Database Migration

Run the SQL schema:

```bash
psql your_database < docs/database/staff_invite_codes_schema.sql
```

Or execute in Supabase SQL Editor:

```sql
-- See docs/database/staff_invite_codes_schema.sql
```

---

## Testing Checklist

### Registration

- [ ] Customer can register at `/auth/register` without invite code
- [ ] Customer cannot manually set role (always becomes customer)
- [ ] Staff registration at `/auth/register/staff` requires invite code
- [ ] Invalid invite code shows error
- [ ] Expired invite code shows error
- [ ] Used invite code shows error (cannot reuse)
- [ ] Valid invite code creates user with correct role
- [ ] Invite code marked as used after successful registration

### Login & Redirects

- [ ] Customer login redirects to `/menu`
- [ ] Staff login redirects to `/staff`
- [ ] Manager login redirects to `/staff`
- [ ] Admin login redirects to `/staff`

### Route Protection

- [ ] Customer cannot access `/staff` (redirected to `/menu`)
- [ ] Customer cannot access `/admin` (redirected to `/menu`)
- [ ] Staff can access `/staff`
- [ ] Staff cannot access `/admin` (redirected to `/staff`)
- [ ] Manager can access `/staff`
- [ ] Manager can access `/admin`
- [ ] Admin can access `/staff`
- [ ] Admin can access `/admin`

### Navbar

- [ ] Customer sees only customer dropdown
- [ ] Staff sees only staff dropdown
- [ ] Manager sees both manager and staff dropdowns
- [ ] Admin sees both admin and staff dropdowns
- [ ] Logout button visible to all authenticated users

### Original User Stories

- [ ] CSA-13: Customer registration works
- [ ] CSA-19: Staff registration with invite works
- [ ] CSA-24: Login works
- [ ] CSA-29: Logout works
- [ ] CSA-33: View profile works
- [ ] CSA-38: Update profile works
- [ ] CSA-43: Delete account works
- [ ] CSA-48: Role-based access enforced
- [ ] CSA-53: Sessions persist across reloads
- [ ] CSA-57: Blocked users redirected correctly

---

## Future Enhancements

### Admin UI for Invite Management

**Priority**: High

**Description**: Build admin interface for creating/managing invite codes

**Features**:

- Create invite codes with role selection
- Set expiration dates
- View all invites (used/unused/expired)
- Revoke unused invites
- Track who used which invite

**Location**: `/admin/invites`

### Granular Permission System

**Priority**: Medium

**Description**: Differentiate manager vs. admin permissions at feature level

**Examples**:

- Manager can manage staff schedules
- Manager cannot delete users
- Admin can delete users
- Admin can change system settings

**Implementation**: Permission checks in API routes and UI components

### Email Integration

**Priority**: Medium

**Description**: Email invite codes to new staff members

**Features**:

- Email invite link with embedded code
- Automatic invite code generation
- Expiration reminders
- Resend invite option

### Invite Analytics

**Priority**: Low

**Description**: Track invite usage and onboarding metrics

**Metrics**:

- Invites created per admin
- Average time from invite to first login
- Invite expiration rate
- Role distribution over time

---

## Conclusion

The manager role and dual-registration strategy improve security and operational clarity while maintaining full backwards compatibility. All original user stories remain satisfied, and the architecture supports future enhancement of permission systems.

The key insight: **Routing by role, permissions by feature**. Managers and admins share dashboards but have different capabilities within those dashboards.
