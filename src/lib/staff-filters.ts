/**
 * Staff Filtering Utilities
 *
 * PURPOSE:
 * Provides reusable filtering logic for staff management search and filters.
 * Handles text search, role filtering, and date range filtering.
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * REQUIREMENTS:
 * - FR1-FR4: Text search (name, email)
 * - FR5-FR10: Role and date filtering
 * - NFR1-NFR5: Performance targets
 */

export interface Staff {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "staff" | "manager" | "admin";
  blocked: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface FilterState {
  searchQuery: string;
  roles: string[];
  joinDateRange: string | null;
  lastLoginRange: string | null;
}

/**
 * Filter staff by search query (name or email)
 *
 * @param staff - Array of staff to filter
 * @param query - Search query (case-insensitive)
 * @returns Filtered staff array
 */
export function filterBySearch(staff: Staff[], query: string): Staff[] {
  if (!query.trim()) return staff;

  const lowerQuery = query.toLowerCase().trim();

  return staff.filter((member) => {
    const name = member.full_name?.toLowerCase() || "";
    const email = member.email.toLowerCase();

    return name.includes(lowerQuery) || email.includes(lowerQuery);
  });
}

/**
 * Filter staff by role(s)
 *
 * @param staff - Array of staff to filter
 * @param roles - Array of roles to include (empty = all)
 * @returns Filtered staff array
 */
export function filterByRole(staff: Staff[], roles: string[]): Staff[] {
  if (!roles || roles.length === 0) return staff;

  return staff.filter((member) => roles.includes(member.role));
}

/**
 * Calculate days between two dates
 *
 * @param date - Date to compare
 * @param now - Current date (defaults to now)
 * @returns Number of days between dates
 */
export function daysBetween(date: Date, now: Date = new Date()): number {
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if date is within specified range
 *
 * @param date - Date to check (can be null)
 * @param range - Range identifier ('last_7_days', 'last_30_days', etc.)
 * @returns True if date is within range
 */
export function isWithinDateRange(
  date: string | null | undefined,
  range: string
): boolean {
  if (!date) {
    // Handle "never logged in" case for last login filter
    return range === "never";
  }

  const dateObj = new Date(date);
  const days = daysBetween(dateObj);

  switch (range) {
    case "last_7_days":
      return days <= 7;
    case "last_30_days":
      return days <= 30;
    case "last_90_days":
      return days <= 90;
    case "90_plus_days":
      return days > 90;
    case "never":
      return false; // Has a date, so not "never"
    default:
      return true;
  }
}

/**
 * Filter staff by join date range
 *
 * @param staff - Array of staff to filter
 * @param range - Range identifier or null (all)
 * @returns Filtered staff array
 */
export function filterByJoinDate(
  staff: Staff[],
  range: string | null
): Staff[] {
  if (!range) return staff;

  return staff.filter((member) => isWithinDateRange(member.created_at, range));
}

/**
 * Filter staff by last login date range
 *
 * @param staff - Array of staff to filter
 * @param range - Range identifier or null (all)
 * @returns Filtered staff array
 */
export function filterByLastLogin(
  staff: Staff[],
  range: string | null
): Staff[] {
  if (!range) return staff;

  return staff.filter((member) =>
    isWithinDateRange(member.last_login_at, range)
  );
}

/**
 * Apply all filters to staff array
 *
 * @param staff - Full staff array
 * @param filters - Filter state object
 * @returns Filtered staff array
 */
export function applyAllFilters(staff: Staff[], filters: FilterState): Staff[] {
  let result = staff;

  // Apply search filter
  result = filterBySearch(result, filters.searchQuery);

  // Apply role filter
  result = filterByRole(result, filters.roles);

  // Apply join date filter
  result = filterByJoinDate(result, filters.joinDateRange);

  // Apply last login filter
  result = filterByLastLogin(result, filters.lastLoginRange);

  return result;
}

/**
 * Get active filter count
 *
 * @param filters - Filter state object
 * @returns Number of active filters
 */
export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;

  if (filters.searchQuery.trim()) count++;
  if (filters.roles.length > 0) count++;
  if (filters.joinDateRange) count++;
  if (filters.lastLoginRange) count++;

  return count;
}

/**
 * Get human-readable filter labels
 *
 * @param filterType - Type of filter ('join' or 'lastLogin')
 * @param range - Range identifier
 * @returns Human-readable label
 */
export function getFilterLabel(
  filterType: "join" | "lastLogin",
  range: string
): string {
  const labels: Record<string, string> = {
    last_7_days: "Last 7 days",
    last_30_days: "Last 30 days",
    last_90_days: "Last 90 days",
    "90_plus_days": "90+ days ago",
    never: "Never",
  };

  const label = labels[range] || range;

  if (filterType === "join") {
    return `Joined: ${label}`;
  } else {
    return `Last login: ${label}`;
  }
}
