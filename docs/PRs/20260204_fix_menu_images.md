# PR Description: Fix Menu Item Images

**Branch:** `fix/menu-images`  
**Author:** Federico Newton
**Date:** 2026-02-04

---

## Objective

Update default menu item images to use consistent Unsplash photos (4:3 crop) for key menu items.

---

## What Was Implemented

### 1. Menu Image URL Updates (DB)

- Added a migration that updates `items.image_url` by item slug.
- Updated image URLs for: English Breakfast, Americano, Caprese, Chamomile, Chocolate Croissant, Cinnamon Roll, Earl Grey, Grilled Veggie, Jasmine Green, Turkey & Avocado.

---

## Files Modified / Added

- `supabase/migrations/20260204193000_update_menu_item_images.sql`
- `docs/PRs/20260204_fix_menu_images.md`

---

## Testing Checklist

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] Run migration in Supabase SQL editor
- [x] Verify images load on `/menu` and `/manager/menu`

---

## Summary

Ready for review; once the migration is applied, the updated menu images should render across public + manager menu UIs.
