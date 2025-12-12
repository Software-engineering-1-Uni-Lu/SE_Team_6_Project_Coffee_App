# UI ↔ Authentication Integration Analysis

**Date**: 2025-12-12
**Purpose**: Reconcile merged UI with existing authentication + RBAC scaffold
**Status**: Analysis Complete, Gaps Documented, Minimal Wiring Required

---

## Executive Summary

The merged UI provides navigation structure and page layouts but is **not yet connected** to the authentication system. The authentication scaffold (API routes, middleware, RBAC) remains **fully functional** and all user stories are **still satisfied at the backend level**. However, the UI needs wiring to properly integrate with the auth system.

**Key Findings**:

- ✅ All 10 authentication user stories remain implemented (backend)
- ✅ RBAC middleware and route protection still functional
- ⚠️ UI navigation is **not role-aware** (shows all links to everyone)
- ⚠️ Login/Register pages are **empty placeholders** (no forms)
- ⚠️ UI routes **don't match** RBAC architecture (`/manager/*` vs `/admin/*`)
- ⚠️ No logout functionality in UI
- ⚠️ No session awareness (Login/Register always visible)

---

## 1. UI Component Inventory

### What Was Merged

**Navigation Components**:

- `src/components/navbar.tsx` - Global navigation bar
  - Always shows: Menu, Customer, Manager, Staff dropdowns
  - Always shows: Login/Register buttons
  - Not role-aware or session-aware

- `src/components/client-layout.tsx` - Layout wrapper
  - Wraps all pages with Navbar and CartModal
  - No authentication awareness

**Auth Pages**:

- `app/auth/login/page.tsx` - Empty placeholder (line 14: `{/* Empty login form container */}`)
- `app/auth/register/page.tsx` - Empty placeholder (line 16: `{/* Empty registration form container */}`)

**Other Components**:

- `src/components/cart-modal.tsx` - Cart functionality (not auth-related)
- `src/components/manager-menu-item-modal.tsx` - Menu management (not auth-related)
- `src/components/theme-provider.tsx` - Theme (not auth-related)

**Root Layout**:

- `app/layout.tsx` - Wraps with ThemeProvider and ClientLayout
  - No authentication provider
  - No session management

---

## 2. Route Mismatch Analysis

### UI Routes vs RBAC Architecture

| UI Route                    | RBAC Route      | Status       | Issue                                                  |
| --------------------------- | --------------- | ------------ | ------------------------------------------------------ |
| `/customer/orders`          | `/customer`     | ❌ Mismatch  | UI expects subpages, RBAC has dashboard only           |
| `/customer/account`         | `/auth/profile` | ⚠️ Different | UI uses `/customer/account`, RBAC uses `/auth/profile` |
| `/manager/dashboard`        | `/admin`        | ❌ Mismatch  | UI uses "manager", RBAC uses "admin"                   |
| `/manager/staff-management` | `/admin/*`      | ❌ Mismatch  | Route naming inconsistency                             |
| `/manager/menu`             | `/admin/*`      | ❌ Mismatch  | Route naming inconsistency                             |
| `/staff/menu`               | `/staff`        | ❌ Mismatch  | UI expects subpages, RBAC has dashboard only           |
| `/staff/orders`             | `/staff`        | ❌ Mismatch  | UI expects subpages, RBAC has dashboard only           |
| `/checkout`                 | Not defined     | ⚠️ Missing   | UI links to it, middleware doesn't protect it          |
| `/account`                  | `/auth/profile` | ⚠️ Different | Duplicate account routes                               |

**Recommendation**: UI routes should be updated to match RBAC architecture, OR middleware should be extended to redirect old routes to new ones.

---

## 3. Authentication User Stories Status

### ✅ CSA-13: Register an account

- **Backend**: ✅ Fully implemented (`/api/auth/register`)
- **UI**: ❌ Empty placeholder page
- **Status**: Backend complete, UI needs form component
- **Impact**: Users cannot register through UI (but API works)

### ✅ CSA-19: Staff/Admin signup

- **Backend**: ✅ Fully implemented (role validation in API)
- **UI**: ❌ No role selector in registration form
- **Status**: Backend complete, UI needs role dropdown
- **Impact**: Cannot select role during registration

### ✅ CSA-24: Log in

- **Backend**: ✅ Fully implemented (`/api/auth/login`)
- **UI**: ❌ Empty placeholder page
- **Status**: Backend complete, UI needs form component
- **Impact**: Users cannot log in through UI (but API works)

### ✅ CSA-29: Log out

- **Backend**: ✅ Fully implemented (`/api/auth/logout`)
- **UI**: ❌ No logout button anywhere
- **Status**: Backend complete, UI needs logout button
- **Impact**: Users cannot log out through UI

### ✅ CSA-33: View account details

- **Backend**: ✅ Fully implemented (`/api/auth/user`, `/auth/profile` page)
- **UI**: ⚠️ Navbar links to `/account` and `/customer/account` (wrong routes)
- **Status**: Backend complete, UI route mismatch
- **Impact**: Links go to wrong pages

### ✅ CSA-38: Modify account details

- **Backend**: ✅ Fully implemented (`/api/auth/update`)
- **UI**: ⚠️ Profile page exists but UI doesn't link correctly
- **Status**: Backend complete, UI routing issue
- **Impact**: Can access via direct URL, not via navigation

### ✅ CSA-43: Delete account

- **Backend**: ✅ Fully implemented (`/api/auth/delete`)
- **UI**: ✅ Part of profile page
- **Status**: Complete
- **Impact**: None

### ✅ CSA-48: Role-based access / dashboard redirect

- **Backend**: ✅ Fully implemented (middleware + dashboard pages)
- **UI**: ❌ Navbar shows all links regardless of role
- **Status**: Backend complete, UI not role-aware
- **Impact**: Users see links they can't access (middleware will block, but poor UX)

### ✅ CSA-53: Persistent session

- **Backend**: ✅ Fully implemented (`useUser` hook)
- **UI**: ❌ Not integrated (Login/Register always visible)
- **Status**: Backend complete, UI not using session hook
- **Impact**: UI doesn't reflect logged-in state

### ✅ CSA-57: Blocked user handling

- **Backend**: ✅ Fully implemented (middleware + `/blocked` page)
- **UI**: ✅ No issues (middleware handles it)
- **Status**: Complete
- **Impact**: None

**Overall**: All user stories are satisfied at the **backend level**. UI integration is needed to provide usable interface.

---

## 4. Critical Issues & Recommendations

### Issue 1: Empty Login/Register Pages

**Problem**: Pages are placeholders with no forms
**Impact**: Users cannot authenticate through UI
**Recommendation**: Wire minimal forms to existing API routes

**Minimal Solution** (DO NOT implement full UI):

```typescript
// In login page, add basic form that POSTs to /api/auth/login
// In register page, add basic form that POSTs to /api/auth/register
```

**UI Developer Responsibility**:

- Create styled forms matching design system
- Add validation and error handling
- Integrate with existing API routes (do NOT bypass them)

---

### Issue 2: Navbar Not Role-Aware

**Problem**: All navigation links visible to everyone
**Impact**: Poor UX (users see inaccessible links), security confusion
**Recommendation**: Make Navbar role-aware using `useUser` hook

**Required Change**:

```typescript
// In navbar.tsx
import { useUser } from "@/src/hooks/useUser";

export function Navbar() {
  const { user, role, loading } = useUser();

  // Hide Customer dropdown if not customer
  // Hide Manager dropdown if not admin
  // Hide Staff dropdown if not staff/admin
  // Hide Login/Register if logged in
  // Show Logout if logged in
}
```

**UI Developer Responsibility**:

- Implement conditional rendering based on role
- Show appropriate links per role
- Add logout button for authenticated users

---

### Issue 3: Route Naming Mismatch

**Problem**: UI uses `/manager/*`, RBAC uses `/admin/*`
**Impact**: Navigation links won't work, middleware will reject
**Recommendation**: Choose one naming convention and update the other

**Option A** (Recommended): Update UI to use `/admin/*`

- Simpler, matches existing RBAC
- Update navbar.tsx links

**Option B**: Update RBAC to use `/manager/*`

- More work (middleware, dashboard pages, docs)
- Might match business terminology better

**Decision Required**: Team must decide on naming convention

---

### Issue 4: Missing Session Awareness

**Problem**: UI doesn't check if user is logged in
**Impact**: Login/Register buttons always visible
**Recommendation**: Use `useUser` hook in Navbar

**Required Change**:

```typescript
const { user } = useUser();

{!user ? (
  // Show Login/Register
) : (
  // Show user email and Logout
)}
```

---

### Issue 5: No Logout Functionality

**Problem**: No logout button in UI
**Impact**: Users cannot log out
**Recommendation**: Add logout button to Navbar

**Minimal Solution**:

```typescript
const handleLogout = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  router.push("/");
};
```

---

## 5. Reconciliation Strategy

### Phase 1: Minimal Wiring (REQUIRED)

These changes are **necessary** to connect existing UI to auth system:

1. **Wire Login Form** (Priority: CRITICAL)
   - Add form inputs to `app/auth/login/page.tsx`
   - POST to `/api/auth/login`
   - Redirect based on role (use API response)

2. **Wire Register Form** (Priority: CRITICAL)
   - Add form inputs to `app/auth/register/page.tsx`
   - Include role selector (customer, staff, admin)
   - POST to `/api/auth/register`
   - Redirect based on role

3. **Make Navbar Session-Aware** (Priority: HIGH)
   - Import and use `useUser` hook
   - Hide Login/Register when logged in
   - Show user info and Logout when logged in

4. **Add Logout Button** (Priority: HIGH)
   - Add to Navbar (when logged in)
   - Call `/api/auth/logout` API
   - Redirect to home page

5. **Fix Route Naming** (Priority: MEDIUM)
   - Decide: `/admin/*` or `/manager/*`
   - Update navbar.tsx to match chosen convention
   - Update middleware if necessary

### Phase 2: Role-Based Navigation (RECOMMENDED)

These changes improve UX but are not critical for functionality:

6. **Make Navbar Role-Aware** (Priority: MEDIUM)
   - Hide Customer dropdown for non-customers
   - Hide Manager dropdown for non-admins
   - Hide Staff dropdown for non-staff
   - Only show accessible links

7. **Fix Route Mismatches** (Priority: MEDIUM)
   - Align UI routes with RBAC dashboard architecture
   - `/customer/orders` → part of `/customer` dashboard
   - `/staff/orders` → part of `/staff` dashboard
   - etc.

### Phase 3: UI Enhancements (FUTURE WORK)

These are UI improvements, not auth reconciliation:

8. Form styling and validation
9. Loading states
10. Error messaging
11. Password reset flow
12. Email confirmation flow

---

## 6. What UI Developers Must Respect

### DO NOT Modify (Production-Ready)

❌ **Authentication API Routes** (`/api/auth/*`)

- These are complete and tested
- All validation, security, role checks are here
- UI must call these, never bypass them

❌ **Middleware** (`middleware.ts`)

- Route protection is correctly implemented
- Role-based access control works
- Do not remove or weaken checks

❌ **Auth Utilities** (`src/lib/auth.ts`)

- `getCurrentUser`, `getUserRole`, `isBlocked`, etc.
- These are server-side security functions
- Do not duplicate this logic client-side

❌ **Dashboard Page Auth Checks** (`app/customer/page.tsx`, etc.)

- Top-level auth validation must stay
- Defense-in-depth security model
- Never remove these checks

### MUST Use (Already Implemented)

✅ **useUser Hook** (`src/hooks/useUser.ts`)

- For client-side session awareness
- Already handles subscriptions and updates
- Use this instead of direct Supabase calls

```typescript
import { useUser } from "@/src/hooks/useUser";

const { user, role, isBlocked, loading } = useUser();
```

✅ **API Routes for Auth Actions**

- Login: POST `/api/auth/login`
- Register: POST `/api/auth/register`
- Logout: POST `/api/auth/logout`
- Get User: GET `/api/auth/user`
- Update: PATCH `/api/auth/update`
- Delete: DELETE `/api/auth/delete`

✅ **Role-Based Redirects**

- After login/register, redirect to:
  - Admin → `/admin`
  - Staff → `/staff`
  - Customer → `/customer`
- Middleware will handle wrong routes

### SAFE to Modify (UI Layer)

✅ **Navigation Components** (`navbar.tsx`, etc.)

- Add role awareness
- Add session awareness
- Change styling/layout

✅ **Auth Page UI** (`login/page.tsx`, `register/page.tsx`)

- Add forms and inputs
- Add styling
- Add validation
- BUT: call API routes, don't bypass them

✅ **Routes** (if aligned with team decision)

- Either update UI to use `/admin/*`
- Or update RBAC to use `/manager/*`
- Must be consistent

---

## 7. Known UI Gaps

These are explicitly documented as **missing features** that UI developers must implement:

### Critical Gaps (Block User Stories)

1. **No Login Form** - Empty placeholder
   - Prevents: CSA-24 (Log in)
   - Required: Form with email/password inputs

2. **No Register Form** - Empty placeholder
   - Prevents: CSA-13 (Register), CSA-19 (Role selection)
   - Required: Form with email/password/role/name inputs

3. **No Logout Button** - No way to log out from UI
   - Prevents: CSA-29 (Log out)
   - Required: Logout button in Navbar

### High Priority Gaps (Poor UX)

4. **Navbar Not Session-Aware** - Always shows Login/Register
   - Impact: Confusing UX (logged-in users see login button)
   - Required: Conditional rendering based on `useUser`

5. **Navbar Not Role-Aware** - Shows all links to everyone
   - Impact: Users see inaccessible links (middleware blocks them)
   - Required: Conditional rendering based on role

6. **Route Naming Inconsistency** - `/manager/*` vs `/admin/*`
   - Impact: Broken navigation links
   - Required: Choose convention and update

### Medium Priority Gaps (Feature Incomplete)

7. **No Dashboard Content** - Dashboards are placeholders
   - Impact: Users land on empty pages after login
   - Required: Implement dashboard features per role

8. **No Protected Route UI** - Links to undefined routes
   - `/checkout`, `/account`, etc. not in middleware
   - Required: Define these routes or remove links

---

## 8. Integration Testing Checklist

After minimal wiring is complete, verify:

### Authentication Flow

- [ ] Can register new customer account
- [ ] Can register staff/admin account (with role selector)
- [ ] Can log in with valid credentials
- [ ] Cannot log in with invalid credentials
- [ ] Can log out
- [ ] Login/Register buttons hidden when logged in
- [ ] User info shown when logged in
- [ ] Session persists across page reload

### Role-Based Access

- [ ] Customer redirected to `/customer` after login
- [ ] Staff redirected to `/staff` after login
- [ ] Admin redirected to `/admin` after login
- [ ] Navbar shows only accessible links per role
- [ ] Customer cannot access `/staff` or `/admin` (middleware blocks)
- [ ] Staff cannot access `/admin` (middleware blocks)
- [ ] Admin can access both `/admin` and `/staff`

### Blocked Users

- [ ] Blocked user redirected to `/blocked` after login
- [ ] Blocked user cannot access any dashboards
- [ ] Blocked user can only see blocked page and logout

---

## 9. Immediate Action Items

### For This Reconciliation Phase

**Priority 1** (Must Do):

1. Add minimal login form to `app/auth/login/page.tsx`
2. Add minimal register form to `app/auth/register/page.tsx`
3. Add `useUser` to Navbar for session awareness
4. Add logout button to Navbar

**Priority 2** (Should Do): 5. Decide on route naming (`/admin/*` vs `/manager/*`) 6. Update Navbar links to match chosen convention 7. Make Navbar role-aware (hide inaccessible links)

**Priority 3** (Nice to Have): 8. Add loading states to auth forms 9. Add error messaging to auth forms 10. Add form validation

### For UI Development Phase

**Backend is Complete** - Do not modify:

- API routes
- Middleware
- Auth utilities
- Dashboard auth checks

**UI Work Required**:

- Implement actual dashboard content
- Create protected route pages
- Build role-specific features
- Add navigation components per role

---

## 10. Architecture Compliance

### Verified: Backend Auth Scaffold ✅

**All user stories implemented at backend level**:

- ✅ CSA-13: Register an account
- ✅ CSA-19: Staff/Admin signup
- ✅ CSA-24: Log in
- ✅ CSA-29: Log out
- ✅ CSA-33: View account details
- ✅ CSA-38: Modify account details
- ✅ CSA-43: Delete account
- ✅ CSA-48: Role-based access / dashboard redirect
- ✅ CSA-53: Persistent session
- ✅ CSA-57: Blocked user handling

**Security model intact**:

- ✅ Middleware provides first line of defense
- ✅ Dashboard pages provide second line of defense
- ✅ API routes validate all requests
- ✅ Session management working
- ✅ Role validation server-side

### Verified: UI Gaps Do Not Break Backend ✅

**UI gaps are cosmetic/usability issues, not security issues**:

- Empty login/register forms → Backend API still works
- Missing logout button → Backend logout API still works
- Non-role-aware Navbar → Middleware still blocks unauthorized access
- Route naming mismatch → Middleware still protects correctly

**Conclusion**: The authentication scaffold is **production-ready**. The UI just needs to be **connected** to it. No backend changes required.

---

## 11. Final Recommendations

### For Immediate Reconciliation

**Goal**: Connect existing UI to existing auth backend
**Approach**: Minimal wiring, no new features
**Deliverables**:

1. Working login form (calls `/api/auth/login`)
2. Working register form (calls `/api/auth/register`)
3. Logout button (calls `/api/auth/logout`)
4. Session-aware Navbar (uses `useUser`)
5. Route naming alignment (choose convention)

**Do NOT**:

- Build complex UI components
- Add features beyond user stories
- Modify backend auth logic
- Bypass API routes with direct Supabase calls

### For Future UI Development

**When building dashboard features**:

- Use `useUser` hook for session/role
- Call API routes for auth actions
- Respect middleware protection
- Follow RBAC architecture
- Refer to `CLAUDE.md` "Role-Based Dashboard Architecture" section

**When stuck**:

- Check `docs/PRs/20251212_authentication_scaffold.md`
- Check `docs/PRs/20251212_role_based_routing.md`
- Check inline comments in dashboard pages
- Ask for clarification rather than guessing

---

## 12. Success Criteria

Reconciliation is complete when:

✅ Users can log in through UI form
✅ Users can register through UI form (with role selection)
✅ Users can log out through UI button
✅ Navbar shows/hides login based on session
✅ Navbar shows only accessible links per role
✅ All navigation links go to correct routes
✅ Role-based redirects work correctly
✅ All 10 user stories remain satisfied
✅ No backend auth logic modified
✅ No security weakened

**Status**: NOT YET COMPLETE - Minimal wiring required (see Action Items above)
