# Pull Request: Staff Order Queue with Priorities

**Branch:** `feature/staff-foundation/order-queue`  
**Author:** Federico Newton
**Date:** December 16, 2025

---

## Objective

Implement the "Order queue with priorities" user story for the Staff Foundation epic (CSA-121 through CSA-124) to allow staff members to view, filter, and manage active customer orders with priority-based sorting.

---

## What Was Implemented

### 1. Order Type Definitions (CSA-121 Foundation)

Created comprehensive type definitions in `src/types/order.ts`:

- **`OrderStatus`** - Union type for all order statuses: pending, confirmed, preparing, ready, completed, cancelled
- **`OrderItem`** - Interface for items within an order (including modifiers)
- **`OrderCustomer`** - Interface for customer profile data from join
- **`Order`** - Complete order interface with all fields including guest info
- **`ACTIVE_ORDER_STATUSES`** - Constant array for queue-relevant statuses
- **`ORDER_STATUS_CONFIG`** - Configuration object with display labels and colors for each status

Helper functions:

- `getOrderCustomerName()` - Returns appropriate name (guest or registered customer)
- `getOrderCustomerEmail()` - Returns appropriate email
- `formatOrderPrice()` - Formats cents to currency display
- `formatOrderTime()` / `formatOrderDate()` - Date/time formatters
- `getOrderAge()` - Human-readable time elapsed since order

### 2. Staff Orders Page (CSA-121)

Implemented full `/staff/orders` page with:

- **Client-side rendering** using React hooks (`useState`, `useEffect`, `useCallback`)
- **Real-time Supabase subscription** for automatic updates when orders change
- **Responsive layout** with order cards and quick stats
- **Loading and error states** with retry functionality
- **Coffee-themed styling** following existing design patterns

### 3. Active Orders Fetching (CSA-122)

Implemented data fetching for active orders:

- Fetches orders with statuses: `pending`, `confirmed`, `preparing`
- **Join with profiles table** to get customer information (name, email, phone)
- **Supabase real-time subscription** on the orders table for live updates
- Proper error handling and loading states

Query pattern:

```typescript
const { data } = await supabase
  .from("orders")
  .select(
    `
    *,
    customer:profiles!orders_customer_id_fkey(
      id, full_name, email, phone
    )
  `
  )
  .in("status", ACTIVE_ORDER_STATUSES)
  .order("created_at", { ascending: true });
```

### 4. Priority Sorting (CSA-123)

Implemented priority-based sorting:

- **Orders sorted by `created_at` ascending** (oldest first = highest priority)
- **Visual priority indicator** for orders older than 10 minutes (configurable threshold)
- **Priority badge** (⚡ Priority) displayed on high-priority order cards
- Orders appear with oldest (most urgent) at the top of the queue

### 5. Order Summary Modal (CSA-124)

Implemented comprehensive order detail modal showing:

- **Order ID** (truncated for display)
- **Status badge** with color coding
- **Guest order indicator**
- **Customer Information section**:
  - Name (guest name or registered customer name)
  - Email
  - Phone (when available)
- **Order Items section**:
  - Item name with quantity
  - Modifier details with prices
  - Per-item totals
- **Special Instructions** section (highlighted in yellow when present)
- **Payment Details section**:
  - Subtotal, Tax, Total
  - Payment method (card/cash)
  - Payment status (paid/unpaid) with color coding
- **Timestamp** with relative time ("2 hours ago")

### 6. Additional Features

- **Status filter tabs**: All Active, Pending, Confirmed, Preparing with counts
- **Quick stats panel**: Shows count of orders in each active status
- **Guest order badges**: Visual indicator for guest vs registered customer orders
- **Order age display**: Shows time since order was placed
- **Notes preview**: Truncated notes shown on order cards
- **Empty state**: Friendly message when no orders match filter
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML

---

## Files Modified / Added

**Added:**

- `src/types/order.ts` - Complete order type definitions, status configuration, and helper functions

**Modified:**

- `app/staff/orders/page.tsx` - Full implementation of staff orders queue page with:
  - OrderCard component
  - OrderDetailModal component
  - StatusBadge component
  - StatusFilter component
  - Priority sorting logic
  - Real-time subscription setup

---

## Testing Checklist

- [x] Staff can log in and access /staff/orders page
- [x] Active orders (pending, confirmed, preparing) are displayed
- [x] Orders are sorted by priority (oldest first)
- [x] Priority indicator (⚡) shown for orders older than 10 minutes
- [x] Guest orders show "Guest" badge
- [x] Status filter tabs work correctly
- [x] Quick stats show accurate counts
- [x] "View Details" button opens order modal
- [x] Modal shows customer name and email
- [x] Modal shows all order items with modifiers
- [x] Modal shows special instructions when present
- [x] Modal shows payment details
- [x] Modal can be closed via button or backdrop click
- [x] Empty state displays when no orders match filter
- [x] Loading state shows spinner during data fetch
- [x] Error state shows retry button on failure
- [x] Real-time updates work (orders appear without refresh)

---

## Known Issues / TODOs

- None at this time.

---

## Technical Notes

### Assumptions Made

1. **Priority threshold**: Orders older than 10 minutes are marked as high priority (configurable via `PRIORITY_THRESHOLD_MINUTES` constant)
2. **Sorting logic**: ASAP/earliest first means sorting by `created_at` ascending
3. **Customer data**: Used left join pattern with profiles table to get customer info for registered users
4. **Guest handling**: Guest orders use `guest_name` and `guest_email` fields; registered customer orders use joined profile data

### Real-time Updates

The page subscribes to Supabase Realtime on the `orders` table to automatically refresh when:

- New orders are placed
- Order status changes
- Orders are cancelled

### Component Architecture

- **Page component** (Server entry point, client-rendered)
- **OrderCard** - Displays order summary in queue list
- **OrderDetailModal** - Full order details in modal overlay
- **StatusBadge** - Reusable status indicator
- **StatusFilter** - Tab-based filter controls

---

## Summary

All four tasks (CSA-121 through CSA-124) have been successfully implemented. The staff orders queue page is fully functional with priority sorting, status filtering, and comprehensive order detail modals.
