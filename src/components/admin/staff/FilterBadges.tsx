/**
 * FilterBadges Component
 *
 * PURPOSE:
 * Displays active filters as removable badges with a "Clear All" option.
 * Provides visual feedback about current filter state.
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * REQUIREMENTS:
 * - FR11: View all active filters at a glance
 * - FR12: Remove individual active filters
 * - FR13: Clear all active filters with single action
 * - NFR13: Visual consistency with design system
 */

import { getFilterLabel } from "@/src/lib/staff-filters";

export interface FilterBadge {
  id: string;
  label: string;
  onRemove: () => void;
}

interface FilterBadgesProps {
  searchQuery: string;
  roles: string[];
  joinDateRange: string | null;
  lastLoginRange: string | null;
  onClearSearch: () => void;
  onRemoveRole: (role: string) => void;
  onClearJoinDate: () => void;
  onClearLastLogin: () => void;
  onClearAll: () => void;
  resultCount: number;
  totalCount: number;
}

export default function FilterBadges({
  searchQuery,
  roles,
  joinDateRange,
  lastLoginRange,
  onClearSearch,
  onRemoveRole,
  onClearJoinDate,
  onClearLastLogin,
  onClearAll,
  resultCount,
  totalCount,
}: FilterBadgesProps) {
  // Build badges array
  const badges: FilterBadge[] = [];

  // Search badge
  if (searchQuery.trim()) {
    badges.push({
      id: "search",
      label: `Search: "${searchQuery}"`,
      onRemove: onClearSearch,
    });
  }

  // Role badges
  roles.forEach((role) => {
    badges.push({
      id: `role-${role}`,
      label: `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      onRemove: () => onRemoveRole(role),
    });
  });

  // Join date badge
  if (joinDateRange) {
    badges.push({
      id: "joinDate",
      label: getFilterLabel("join", joinDateRange),
      onRemove: onClearJoinDate,
    });
  }

  // Last login badge
  if (lastLoginRange) {
    badges.push({
      id: "lastLogin",
      label: getFilterLabel("lastLogin", lastLoginRange),
      onRemove: onClearLastLogin,
    });
  }

  // Don't render if no active filters
  if (badges.length === 0) {
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing all {totalCount} staff members</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          Showing {resultCount} of {totalCount} staff members
        </span>
        <button
          onClick={onClearAll}
          className="text-sm text-primary hover:text-primary/80 hover:underline"
          aria-label="Clear all filters"
        >
          Clear all filters
        </button>
      </div>

      {/* Active filter badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            {badge.label}
            <button
              onClick={badge.onRemove}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
              aria-label={`Remove ${badge.label} filter`}
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
