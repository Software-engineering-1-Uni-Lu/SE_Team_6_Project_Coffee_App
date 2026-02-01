# How to Access Missing Ingredients Feature

## For Staff Members

### Option 1: Via Navigation Bar (Recommended)

1. Login as a staff member
2. Look at the top navigation bar
3. Click on **"Staff"** dropdown menu
4. Select **"Missing Ingredients"**

### Option 2: Via Staff Dashboard

1. Login as a staff member
2. Go to the Staff Dashboard (`/staff`)
3. Look at the **"Quick Actions"** card on the right side
4. Click **"⚠️ Report Missing Ingredients"**

### Option 3: Direct Link

Simply navigate to: `/staff/ingredients`

## For Managers

### Via Navigation Bar

1. Login as a manager
2. Look at the top navigation bar
3. Click on **"Manager"** dropdown menu
4. Select **"Missing Ingredients"**
   - This takes you to the management interface where you can:
     - View all notifications
     - Mark notifications as resolved or ignored
     - Delete notifications
     - Track which staff member reported each issue

### Direct Link

Navigate to: `/manager/missing-ingredients`

## Navigation Structure

```
Top Navigation Bar
├── Staff (dropdown) ← Staff/Manager/Admin only
│   ├── Menu
│   ├── Orders
│   └── Missing Ingredients ← NEW!
│
└── Manager (dropdown) ← Manager/Admin only
    ├── Dashboard
    ├── Staff Management
    ├── Menu Management
    ├── Ingredients
    ├── Bulk Stock Import
    ├── Stock Audit Log
    └── Missing Ingredients ← NEW!
```

## What Each Page Does

### Staff View (`/staff/ingredients`)

- **Report missing ingredients** - Quick form to report items that are out of stock
- **View low stock alerts** - See ingredients below threshold
- **View notification history** - See what's been reported
- **Filter notifications** - View Pending, Resolved, or All notifications

### Manager View (`/manager/missing-ingredients`)

- **Manage all notifications** - See all reports from staff
- **Take action** - Mark as Resolved, Ignore, or Delete
- **Track accountability** - See who reported and who resolved each notification
- **Monitor stock issues** - Identify patterns in missing ingredients

## Quick Start Guide

### As a Staff Member:

1. Notice an ingredient is missing or low
2. Click **Staff** → **Missing Ingredients** in navbar
3. Select the ingredient from dropdown
4. (Optional) Add a note explaining the situation
5. Click **"Report Missing"**
6. ✅ Manager is notified!

### As a Manager:

1. Click **Manager** → **Missing Ingredients** in navbar
2. Review pending notifications
3. Take action:
   - **Mark Resolved** if you've restocked
   - **Ignore** if it's not critical
   - **Delete** if it's a duplicate or mistake
4. View resolved history in the **"Resolved"** tab

## Visual Cues

- 🟡 **Yellow Alert Badge**: Shows on low-stock items
- 📋 **Pending Tab**: Unresolved notifications
- ✅ **Resolved Tab**: Completed actions
- 📊 **Stock Display**: Current quantity vs. threshold

## Keyboard Shortcuts (Future Enhancement)

- `Alt + I` - Quick access to report missing ingredient
- `Alt + M` - Navigate to missing ingredients page
- `Enter` - Submit form
- `Esc` - Cancel/Close

## Troubleshooting

**Can't see "Staff" or "Manager" dropdown?**

- Make sure you're logged in
- Verify your role is staff, manager, or admin
- Try refreshing the page

**Link not working?**

- Ensure the database migration has been run
- Check that you have proper permissions
- Clear browser cache and try again

**Can't report duplicate ingredient?**

- This is by design! Only one pending notification per ingredient
- Ask a manager to resolve the existing notification first
- Or wait for it to be resolved

## Support

For issues or questions:

- Check the API documentation at `/docs/features/MISSING_INGREDIENTS_NOTIFICATION.md`
- Review test examples in the test files
- Contact your system administrator
