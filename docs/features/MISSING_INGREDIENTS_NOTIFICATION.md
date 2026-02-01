# Missing Ingredients Notification Feature

## Overview

This feature allows staff members to report missing or low-stock ingredients and enables managers to track and manage these notifications efficiently. This helps ensure timely restocking and prevents service disruptions due to ingredient shortages.

## User Stories Addressed

- **Staff**: Report missing ingredients quickly during operations
- **Staff**: View current low-stock alerts and pending notifications
- **Manager**: Track all missing ingredient reports from staff
- **Manager**: Resolve or ignore notifications based on restocking actions
- **Manager**: Maintain a history of ingredient availability issues

## Architecture

### Database Schema

**Table**: `missing_ingredient_notifications`

- `id` (UUID, Primary Key)
- `bean_id` (UUID, Foreign Key → beans.id)
- `reported_by` (UUID, Foreign Key → auth.users.id)
- `status` (TEXT: 'pending', 'resolved', 'ignored')
- `note` (TEXT, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `resolved_at` (TIMESTAMP WITH TIME ZONE, nullable)
- `resolved_by` (UUID, Foreign Key → auth.users.id, nullable)

**Indexes**:

- `idx_missing_ingredients_status` on `status`
- `idx_missing_ingredients_bean_id` on `bean_id`
- `idx_missing_ingredients_created_at` on `created_at DESC`

**RLS Policies**:

- Staff and above can view notifications
- Staff and above can report missing ingredients
- Managers and admins can update notifications
- Managers and admins can delete notifications

**Triggers**:

- Auto-update `updated_at` timestamp on modifications
- Auto-set `resolved_at` and `resolved_by` when status changes to 'resolved' or 'ignored'

### API Endpoints

#### GET /api/ingredients/missing

Fetch missing ingredient notifications with filtering support.

**Authentication**: Required (Staff+)
**Query Parameters**:

- `status` (optional): 'pending' | 'resolved' | 'all' (default: 'pending')

**Response** (200):

```json
{
  "notifications": [
    {
      "id": "uuid",
      "bean_id": "uuid",
      "reported_by": "uuid",
      "status": "pending",
      "note": "Running low on coffee beans",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-02-01T10:00:00Z",
      "resolved_at": null,
      "resolved_by": null,
      "beans": {
        "id": "uuid",
        "name": "Arabica Coffee Beans",
        "stock_quantity": 5,
        "low_stock_threshold": 10,
        "unit": "g"
      },
      "reporter": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "resolver": null
    }
  ]
}
```

**Error Responses**:

- 401: Unauthorized (not authenticated)
- 403: Forbidden (not staff or above)
- 500: Internal server error

#### POST /api/ingredients/missing

Report a missing or low-stock ingredient.

**Authentication**: Required (Staff+)
**Request Body**:

```json
{
  "bean_id": "uuid",
  "note": "Optional note about the shortage"
}
```

**Response** (201):

```json
{
  "notification": {
    "id": "uuid",
    "bean_id": "uuid",
    "reported_by": "uuid",
    "status": "pending",
    "note": "Optional note",
    "beans": { ... },
    "reporter": { ... }
  }
}
```

**Error Responses**:

- 400: Bean ID is required
- 401: Unauthorized
- 403: Forbidden
- 404: Ingredient not found
- 409: A pending notification already exists for this ingredient
- 500: Internal server error

#### PATCH /api/ingredients/missing/[id]

Update a notification's status (Manager only).

**Authentication**: Required (Manager+)
**Request Body**:

```json
{
  "status": "resolved",
  "note": "Optional updated note"
}
```

**Response** (200):

```json
{
  "notification": { ... }
}
```

**Error Responses**:

- 400: Invalid status
- 401: Unauthorized
- 403: Forbidden (not manager)
- 500: Internal server error

#### DELETE /api/ingredients/missing/[id]

Delete a notification (Manager only).

**Authentication**: Required (Manager+)
**Response** (200):

```json
{
  "message": "Notification deleted successfully"
}
```

**Error Responses**:

- 401: Unauthorized
- 403: Forbidden
- 500: Internal server error

### Frontend Pages

#### /staff/ingredients

**Purpose**: Staff interface for reporting and viewing missing ingredients
**Features**:

- Low stock alert banner showing ingredients below threshold
- Form to report missing ingredients with optional notes
- List of notifications with filtering (Pending, Resolved, All)
- View notification history with reporter information
- Real-time stock quantity display

**Access**: Staff, Manager, Admin

#### /manager/missing-ingredients

**Purpose**: Manager interface for managing missing ingredient notifications
**Features**:

- Pending notification count alert
- Tabbed interface (Pending, Resolved, All)
- Action buttons for each notification:
  - Mark as Resolved
  - Ignore
  - Delete
- Low stock indicators
- Reporter and resolver tracking
- Timestamp information

**Access**: Manager, Admin

## File Structure

```
supabase/
  migrations/
    20260202000000_missing_ingredients_notifications.sql

app/
  api/
    ingredients/
      missing/
        route.ts                    # GET, POST endpoints
        [id]/
          route.ts                  # PATCH, DELETE endpoints
        __tests__/
          missing.test.ts           # API tests (10 tests)

  staff/
    ingredients/
      page.tsx                      # Staff notification interface

  manager/
    missing-ingredients/
      page.tsx                      # Manager management interface
```

## Testing

### API Tests

Location: `app/api/ingredients/missing/__tests__/missing.test.ts`

**Test Coverage** (10 tests, all passing):

- ✓ GET returns 401 if user is not authenticated
- ✓ GET returns 403 if user is not staff or above
- ✓ GET returns pending notifications by default for staff
- ✓ GET returns all notifications when status=all
- ✓ POST returns 401 if user is not authenticated
- ✓ POST returns 400 if bean_id is missing
- ✓ POST returns 404 if ingredient does not exist
- ✓ POST returns 409 if pending notification already exists
- ✓ POST creates notification successfully

**Run tests**:

```bash
npm test -- app/api/ingredients/missing/__tests__/missing.test.ts
```

### Manual Testing Checklist

**Staff Workflow**:

- [ ] Login as staff member
- [ ] Navigate to /staff/ingredients
- [ ] See low stock alert banner (if applicable)
- [ ] Select an ingredient from dropdown
- [ ] Add optional note
- [ ] Submit notification
- [ ] See success message
- [ ] Verify notification appears in list
- [ ] Test filtering by status (Pending, Resolved, All)
- [ ] Verify cannot report duplicate pending notification

**Manager Workflow**:

- [ ] Login as manager
- [ ] Navigate to /manager/missing-ingredients
- [ ] See pending notification count alert
- [ ] View pending notifications
- [ ] Mark notification as resolved
- [ ] Verify resolved_at and resolved_by are set
- [ ] Ignore a notification
- [ ] Delete a notification
- [ ] View resolved notifications tab
- [ ] View all notifications tab
- [ ] Verify stock quantities are accurate

**Authorization Tests**:

- [ ] Customer cannot access /staff/ingredients
- [ ] Customer cannot access /manager/missing-ingredients
- [ ] Staff cannot mark notifications as resolved
- [ ] Staff cannot delete notifications

## Integration Points

### Existing Ingredient System

- Uses existing `beans` table for ingredient data
- Leverages existing `stock_quantity` and `low_stock_threshold` fields
- Integrates with ingredient management in `/manager/ingredients`

### User Authentication

- Uses `useUser()` hook for role-based access control
- Integrates with existing authentication system
- Tracks reporter and resolver via user IDs

### Database Triggers

- Automatic inventory deduction on order confirmation (existing)
- New: Automatic timestamp updates on notification changes
- New: Automatic resolver tracking on status changes

## Security Considerations

1. **Row Level Security (RLS)**
   - All policies enforce role-based access
   - Staff cannot modify status (read/create only)
   - Managers have full CRUD access

2. **API Authorization**
   - All endpoints verify authentication
   - Role checks prevent privilege escalation
   - Proper error messages without information leakage

3. **Data Validation**
   - Bean ID existence verification
   - Status enum validation
   - Duplicate notification prevention

4. **Audit Trail**
   - Reporter tracking for all notifications
   - Resolver tracking for closed notifications
   - Timestamp tracking for all actions

## Future Enhancements

1. **Notifications**
   - Email notifications to managers when ingredient reported
   - Push notifications for critical low-stock items
   - Daily digest of pending notifications

2. **Analytics**
   - Most frequently reported ingredients
   - Average resolution time
   - Stock-out prediction based on patterns

3. **Integration**
   - Auto-create purchase orders from notifications
   - Supplier integration for automated ordering
   - Inventory forecasting based on order patterns

4. **Mobile Support**
   - Quick-report mobile interface for staff
   - Barcode scanning for ingredient selection
   - Offline support for reporting

## Migration Instructions

### Database Setup

1. Run the migration:

```bash
npx supabase db push
```

2. Verify table creation:

```sql
SELECT * FROM missing_ingredient_notifications LIMIT 0;
```

3. Test RLS policies:

```sql
-- As staff user
SELECT * FROM missing_ingredient_notifications;
INSERT INTO missing_ingredient_notifications (bean_id, reported_by) VALUES (...);

-- As manager user
UPDATE missing_ingredient_notifications SET status = 'resolved' WHERE id = ...;
DELETE FROM missing_ingredient_notifications WHERE id = ...;
```

### Deployment Checklist

- [ ] Run database migration
- [ ] Verify RLS policies are active
- [ ] Test all API endpoints
- [ ] Verify role-based access controls
- [ ] Test staff notification workflow
- [ ] Test manager resolution workflow
- [ ] Check UI responsiveness on mobile
- [ ] Verify low stock alerts work correctly
- [ ] Test duplicate notification prevention
- [ ] Monitor for any console errors

## Maintenance

### Regular Tasks

- Monitor notification resolution times
- Review frequently reported ingredients
- Archive old resolved notifications (consider retention policy)
- Update low stock thresholds based on usage patterns

### Troubleshooting

**Issue**: Staff cannot submit notifications

- Check authentication status
- Verify role in profiles table
- Check browser console for API errors
- Verify ingredient exists in beans table

**Issue**: Manager cannot resolve notifications

- Check manager role assignment
- Verify RLS policies are enabled
- Check for database connection issues

**Issue**: Duplicate notifications allowed

- Verify unique constraint on pending notifications
- Check API validation logic
- Review database transaction handling

## Support

For issues or questions, refer to:

- API documentation in route files
- Component documentation in page files
- Database schema in migration file
- Test files for usage examples
