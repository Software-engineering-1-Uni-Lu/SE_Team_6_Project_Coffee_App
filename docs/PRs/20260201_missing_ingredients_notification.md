# PR Description: Missing Ingredients Notification System

**Branch:** `feature/staff/notify-missing-ingredients`
**Author:** Eric Damian
**Date:** 2026-02-01

---

## Objective

Implement a comprehensive notification system that allows staff members to report missing or low-stock ingredients and enables managers to track and resolve these notifications efficiently.

---

## What Was Implemented

### 1. Database Schema & Migration

- **Created `missing_ingredient_notifications` table**: Stores notifications with status tracking (pending, resolved, ignored).
- **Added foreign key relationships**: Links to `beans` table for ingredient details and `profiles` table for reporter/resolver information.
- **Implemented RLS policies**: Role-based access control ensuring staff can view/create notifications and managers can update/delete them.
- **Created helper function `is_staff_or_above()`**: Reusable function for checking user roles (staff, manager, admin).
- **Added automatic timestamp trigger**: Updates `updated_at` field on every modification.
- **Fixed Supabase PostgREST compatibility**: Corrected foreign key references to use `public.profiles(id)` instead of `auth.users(id)`.

### 2. API Endpoints

- **GET `/api/ingredients/missing`**: Fetch all notifications with filtering by status, proper joins to beans and profiles tables.
- **POST `/api/ingredients/missing`**: Create new notifications with validation for existing beans and duplicate prevention.
- **PATCH `/api/ingredients/missing/[id]`**: Update notification status (resolve/ignore) with manager authorization.
- **DELETE `/api/ingredients/missing/[id]`**: Remove notifications with manager authorization.
- **Fixed PostgREST relationship syntax**: Updated all queries to use `profiles!reported_by` and `profiles!resolved_by` for proper foreign key joins.
- **Comprehensive error handling**: Added validation for authentication, authorization, bean existence, and duplicate notifications.

### 3. Staff Interface

- **Created `/staff/ingredients` page**: Clean, coffee-themed UI for staff to view and report missing ingredients.
- **Low-stock alerts section**: Displays beans below threshold with visual warnings.
- **Notification form**: Simple interface to select ingredient and add optional notes.
- **Active notifications list**: Shows pending and ignored notifications with status badges and timestamps.
- **Real-time feedback**: Success/error messages for all operations.
- **Responsive design**: Mobile-friendly layout with coffee theme colors.

### 4. Manager Interface

- **Created `/manager/missing-ingredients` page**: Dedicated management interface for reviewing notifications.
- **Status filtering tabs**: All, Pending, Resolved, Ignored views for efficient workflow.
- **Action buttons**: Resolve, Ignore, and Delete options with confirmation dialogs.
- **Detailed notification cards**: Shows ingredient details, stock levels, reporter info, timestamps, and notes.
- **Bulk management**: Table layout with inline actions for quick processing.
- **Coffee theme styling**: Consistent design with amber/emerald status badges.

### 5. Navigation Integration

- **Added to navbar**: "Missing Ingredients" link in both Staff and Ingredients dropdowns.
- **Added to staff dashboard**: Quick action button for easy access to reporting feature.
- **Contextual placement**: Positioned logically within existing navigation structure.

### 6. Testing & Validation

- **Comprehensive test suite**: 10 tests covering all endpoints and edge cases.
- **Authentication tests**: Validates that unauthenticated requests are rejected.
- **Authorization tests**: Ensures role-based access control works correctly.
- **Validation tests**: Checks for missing fields, invalid IDs, and duplicate notifications.
- **CRUD operation tests**: Verifies create, read, update, and delete functionality.
- **All tests passing**: 100% success rate with proper mocking of Supabase client.

---

## Files Modified / Added

### Database & Migration

- `SETUP_MISSING_INGREDIENTS.sql` - Complete migration script with helper function, table creation, RLS policies, and triggers

### API Routes

- `app/api/ingredients/missing/route.ts` - GET and POST endpoints for fetching and creating notifications
- `app/api/ingredients/missing/[id]/route.ts` - PATCH and DELETE endpoints for updating and removing notifications
- `app/api/ingredients/missing/__tests__/missing.test.ts` - Comprehensive test suite (10 tests)

### User Interfaces

- `app/staff/ingredients/page.tsx` - Staff interface for reporting missing ingredients
- `app/manager/missing-ingredients/page.tsx` - Manager interface for reviewing and resolving notifications

### Navigation

- `src/components/navbar.tsx` - Added "Missing Ingredients" links to Staff and Ingredients dropdowns
- `app/staff/page.tsx` - Added quick action button to staff dashboard

---

## Testing Checklist

- [x] All 10 API tests passing
- [x] Authentication validation working (unauthenticated requests blocked)
- [x] Authorization validation working (staff cannot resolve, managers cannot create)
- [x] Bean ID validation working (rejects invalid bean IDs)
- [x] Duplicate prevention working (blocks duplicate pending notifications)
- [x] GET endpoint returns correct data with proper joins
- [x] POST endpoint creates notifications successfully
- [x] PATCH endpoint updates status correctly
- [x] DELETE endpoint removes notifications
- [x] Manual testing: Staff can report missing ingredients
- [x] Manual testing: Manager can resolve/ignore notifications
- [x] Manual testing: Low-stock alerts display correctly
- [x] Manual testing: Navigation links work from navbar and dashboard
- [x] Manual testing: Coffee theme styling matches existing pages
- [x] Database migration runs successfully in Supabase
- [x] RLS policies enforce correct access control

---

## Breaking Changes

None - this is a new feature with no impact on existing functionality.

---

## Summary

This PR implements a complete missing ingredients notification system including database schema, API endpoints, staff/manager interfaces, navigation integration, and comprehensive testing. All identified bugs have been fixed, including authentication issues, styling inconsistencies, and Supabase PostgREST compatibility. The feature is fully tested, documented, and ready for review/merge.
