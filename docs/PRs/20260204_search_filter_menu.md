# PR Description: Search & Filter Menu (CSA-199)

**Branch:** `feature/customer/search-filter-menu`
**Author:** Filip
**Date:** 2026-02-04

---

## Objective

Add search and filtering capabilities to the public menu page to allow customers to easily find items based on name, description, dietary preferences (vegetarian, vegan), and allergen exclusions.

---

## What Was Implemented

### 1. Search Functionality

- Added a responsive search bar with an icon.
- Implemented real-time filtering by item name and description (case-insensitive).

### 2. Dietary Filters

- Added toggle buttons for "Vegetarian" and "Vegan" options.
- Implemented logic to filter items based on these toggles (AND logic).

### 3. Allergen Exclusion

- Dynamically computed unique allergens from the available items.
- Added interactive chips to select allergens to exclude.
- Implemented logic to hide items containing selected allergens.

### 4. User Experience Improvements

- Added a "Clear all filters" button that appears when filters are active.
- Updated the empty state message to distinguish between "no items in category" and "no items match filters".
- Preserved existing category filtering while integrating new filters.

---

## Files Modified

- `app/menu/page.tsx`

---

## Testing Checklist

- [x] Search by name filters items correctly
- [x] Search by description filters items correctly
- [x] Vegetarian filter shows only vegetarian items
- [x] Vegan filter shows only vegan items
- [x] Allergen exclusion hides items with selected allergens
- [x] Combined filters work with AND logic (e.g., Vegetarian + Search)
- [x] Clear filters button resets all filters except category
- [x] Empty state message updates appropriately
- [x] Add to Cart functionality works with filtered items

---

## Summary

The menu page now fully supports search and advanced filtering, enhancing the browsing experience for customers with specific dietary needs or preferences. The implementation is fully client-side for immediate feedback and utilizes existing data structures.
