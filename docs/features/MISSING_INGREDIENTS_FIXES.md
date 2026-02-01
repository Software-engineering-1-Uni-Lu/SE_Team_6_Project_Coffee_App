# Missing Ingredients Feature Fixes

**Date:** February 1, 2026
**Issue:** API errors and styling inconsistencies

## Problems Identified

### 1. API Errors

When accessing `/staff/ingredients`, users encountered:

- "Failed to load notifications"
- "Failed to fetch user profile"

**Root Cause:** The API routes were querying the `profiles` table for user roles, but the application uses the `user_roles` table for role management.

### 2. Styling Inconsistencies

The missing ingredients pages used generic blue/gray colors instead of the coffee-themed color scheme used throughout the rest of the application.

## Solutions Implemented

### API Fixes

#### Files Modified:

1. `app/api/ingredients/missing/route.ts` (GET & POST endpoints)
2. `app/api/ingredients/missing/[id]/route.ts` (PATCH & DELETE endpoints)
3. `app/api/ingredients/missing/__tests__/missing.test.ts` (Test mocks)

#### Changes:

- **Before:** Queried `profiles` table with `eq("id", user.id)`
- **After:** Queries `user_roles` table with `eq("user_id", user.id)`

```typescript
// OLD CODE
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

// NEW CODE
const { data: userRole, error: roleError } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .single();
```

### Styling Fixes

#### Coffee Theme Color Palette

Replaced generic colors with the application's coffee theme:

- **Background:** `bg-[hsl(35,20%,95%)]` (light beige)
- **Borders:** `border-[hsl(35,20%,90%)]` (coffee border)
- **Text Primary:** `text-[hsl(25,35%,25%)]` (dark brown)
- **Text Secondary:** `text-[hsl(25,35%,45%)]` (medium brown)
- **Buttons:** `bg-[hsl(25,35%,25%)]` (dark coffee brown)

#### Status Badges

Updated status badge colors:

- **Pending:** `bg-amber-100 text-amber-800 border-amber-300` (amber/yellow tones)
- **Resolved:** `bg-emerald-100 text-emerald-800 border-emerald-300` (green tones)
- **Ignored:** `bg-gray-100 text-gray-800 border-gray-300` (neutral gray)

#### Files Modified:

1. `app/staff/ingredients/page.tsx`
2. `app/manager/missing-ingredients/page.tsx`

#### Key Changes:

- Replaced all `bg-gray-50` with `bg-[hsl(35,20%,95%)]`
- Replaced all `text-gray-900` with `text-[hsl(25,35%,25%)]`
- Replaced all `text-gray-600` with `text-[hsl(25,35%,45%)]`
- Replaced all `border-gray-300` with `border-[hsl(35,20%,90%)]`
- Updated button colors from `bg-blue-600` to `bg-[hsl(25,35%,25%)]`
- Updated alert backgrounds from `bg-yellow-50` to `bg-amber-50`
- Updated success messages from `bg-green-50` to `bg-emerald-50`
- Added `transition-colors` for smoother hover effects

### Test Updates

Updated all test mocks to use `user_roles` instead of `profiles`:

```typescript
mockSupabase.from.mockImplementation((table: string) => {
  if (table === "user_roles") {
    // Changed from "profiles"
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: "staff" },
            error: null,
          }),
        }),
      }),
    };
  }
  // ... other tables
});
```

## Verification

### Tests

All 10 tests passing:

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        0.569 s
```

### TypeScript

No compilation errors in any modified files.

### Visual Consistency

- Staff and manager pages now match the coffee theme
- Colors align with existing pages (orders, dashboard, etc.)
- Smooth transitions on interactive elements

## Impact

- ✅ API errors resolved
- ✅ User can now access and use missing ingredients feature
- ✅ Visual consistency across entire application
- ✅ All tests passing
- ✅ No breaking changes to existing functionality

## Related Documentation

- [Missing Ingredients Notification Feature](./MISSING_INGREDIENTS_NOTIFICATION.md)
- [How to Access Missing Ingredients](./HOW_TO_ACCESS_MISSING_INGREDIENTS.md)
