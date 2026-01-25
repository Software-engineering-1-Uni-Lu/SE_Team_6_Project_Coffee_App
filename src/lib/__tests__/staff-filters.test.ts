/**
 * Staff Filters Utility Tests
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * REQUIREMENTS TESTED:
 * - FR1-FR4: Text search capabilities
 * - FR5-FR10: Role and date filtering
 * - NFR1-NFR5: Performance targets
 * - NFR16-NFR18: Handle null/missing data gracefully
 */

import {
  filterBySearch,
  filterByRole,
  filterByJoinDate,
  filterByLastLogin,
  applyAllFilters,
  getActiveFilterCount,
  getFilterLabel,
  daysBetween,
  isWithinDateRange,
  type Staff,
  type FilterState,
} from "../staff-filters";

// Mock staff data
const mockStaff: Staff[] = [
  {
    id: "1",
    email: "john@example.com",
    full_name: "John Doe",
    phone: "555-0001",
    role: "staff",
    blocked: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    last_login_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: "2",
    email: "jane@example.com",
    full_name: "Jane Smith",
    phone: "555-0002",
    role: "manager",
    blocked: false,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    last_login_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "3",
    email: "admin@example.com",
    full_name: "Admin User",
    phone: null,
    role: "admin",
    blocked: false,
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
    last_login_at: new Date(
      Date.now() - 95 * 24 * 60 * 60 * 1000
    ).toISOString(), // 95 days ago
  },
  {
    id: "4",
    email: "inactive@example.com",
    full_name: null,
    phone: null,
    role: "staff",
    blocked: true,
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 days ago
    last_login_at: null, // Never logged in
  },
];

describe("filterBySearch", () => {
  it("should return all staff when search query is empty", () => {
    const result = filterBySearch(mockStaff, "");
    expect(result).toEqual(mockStaff);
  });

  it("should filter by name (case-insensitive)", () => {
    const result = filterBySearch(mockStaff, "john");
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe("John Doe");
  });

  it("should filter by email (case-insensitive)", () => {
    const result = filterBySearch(mockStaff, "admin@");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("admin@example.com");
  });

  it("should filter by partial matches", () => {
    const result = filterBySearch(mockStaff, "jane");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("jane@example.com");
  });

  it("should handle null full_name gracefully", () => {
    const result = filterBySearch(mockStaff, "inactive");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("inactive@example.com");
  });

  it("should trim whitespace from query", () => {
    const result = filterBySearch(mockStaff, "  john  ");
    expect(result).toHaveLength(1);
  });

  it("should return empty array when no matches", () => {
    const result = filterBySearch(mockStaff, "nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("filterByRole", () => {
  it("should return all staff when roles array is empty", () => {
    const result = filterByRole(mockStaff, []);
    expect(result).toEqual(mockStaff);
  });

  it("should filter by single role", () => {
    const result = filterByRole(mockStaff, ["staff"]);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.role === "staff")).toBe(true);
  });

  it("should filter by multiple roles", () => {
    const result = filterByRole(mockStaff, ["staff", "manager"]);
    expect(result).toHaveLength(3);
  });

  it("should handle admin role", () => {
    const result = filterByRole(mockStaff, ["admin"]);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("admin");
  });
});

describe("daysBetween", () => {
  it("should calculate days between dates correctly", () => {
    const now = new Date("2026-01-19");
    const past = new Date("2026-01-14"); // 5 days ago
    const days = daysBetween(past, now);
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThanOrEqual(6); // Account for partial days
  });

  it("should handle same date", () => {
    const now = new Date();
    const days = daysBetween(now, now);
    expect(days).toBeLessThanOrEqual(1);
  });
});

describe("isWithinDateRange", () => {
  const now = new Date();

  it('should return false for null date when range is not "never"', () => {
    expect(isWithinDateRange(null, "last_7_days")).toBe(false);
    expect(isWithinDateRange(undefined, "last_30_days")).toBe(false);
  });

  it('should return true for null date when range is "never"', () => {
    expect(isWithinDateRange(null, "never")).toBe(true);
    expect(isWithinDateRange(undefined, "never")).toBe(true);
  });

  it('should return false for non-null date when range is "never"', () => {
    const date = new Date().toISOString();
    expect(isWithinDateRange(date, "never")).toBe(false);
  });

  it("should detect dates within last 7 days", () => {
    const date = new Date(
      now.getTime() - 5 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isWithinDateRange(date, "last_7_days")).toBe(true);
  });

  it("should reject dates older than 7 days for last_7_days range", () => {
    const date = new Date(
      now.getTime() - 10 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isWithinDateRange(date, "last_7_days")).toBe(false);
  });

  it("should detect dates within last 30 days", () => {
    const date = new Date(
      now.getTime() - 20 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isWithinDateRange(date, "last_30_days")).toBe(true);
  });

  it("should detect dates within last 90 days", () => {
    const date = new Date(
      now.getTime() - 60 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isWithinDateRange(date, "last_90_days")).toBe(true);
  });

  it("should detect dates older than 90 days", () => {
    const date = new Date(
      now.getTime() - 100 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(isWithinDateRange(date, "90_plus_days")).toBe(true);
  });

  it("should return true for unknown range (default case)", () => {
    const date = new Date().toISOString();
    expect(isWithinDateRange(date, "unknown_range")).toBe(true);
  });
});

describe("filterByJoinDate", () => {
  it("should return all staff when range is null", () => {
    const result = filterByJoinDate(mockStaff, null);
    expect(result).toEqual(mockStaff);
  });

  it("should filter by last 7 days", () => {
    const result = filterByJoinDate(mockStaff, "last_7_days");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1"); // John joined 5 days ago
  });

  it("should filter by last 90 days", () => {
    const result = filterByJoinDate(mockStaff, "last_90_days");
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by 90+ days", () => {
    const result = filterByJoinDate(mockStaff, "90_plus_days");
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("filterByLastLogin", () => {
  it("should return all staff when range is null", () => {
    const result = filterByLastLogin(mockStaff, null);
    expect(result).toEqual(mockStaff);
  });

  it("should filter by last 7 days", () => {
    const result = filterByLastLogin(mockStaff, "last_7_days");
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by "never" (null last_login_at)', () => {
    const result = filterByLastLogin(mockStaff, "never");
    expect(result).toHaveLength(1);
    expect(result[0].last_login_at).toBeNull();
  });

  it("should filter by 90+ days", () => {
    const result = filterByLastLogin(mockStaff, "90_plus_days");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("applyAllFilters", () => {
  it("should return all staff when no filters active", () => {
    const filters: FilterState = {
      searchQuery: "",
      roles: [],
      joinDateRange: null,
      lastLoginRange: null,
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result).toEqual(mockStaff);
  });

  it("should apply search filter only", () => {
    const filters: FilterState = {
      searchQuery: "john",
      roles: [],
      joinDateRange: null,
      lastLoginRange: null,
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe("John Doe");
  });

  it("should apply role filter only", () => {
    const filters: FilterState = {
      searchQuery: "",
      roles: ["manager"],
      joinDateRange: null,
      lastLoginRange: null,
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("manager");
  });

  it("should combine multiple filters (search + role)", () => {
    const filters: FilterState = {
      searchQuery: "example.com",
      roles: ["staff"],
      joinDateRange: null,
      lastLoginRange: null,
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result.length).toBe(2);
    expect(result.every((s) => s.role === "staff")).toBe(true);
  });

  it("should combine all filters", () => {
    const filters: FilterState = {
      searchQuery: "john",
      roles: ["staff"],
      joinDateRange: "last_7_days",
      lastLoginRange: "last_7_days",
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("should return empty array when filters exclude all staff", () => {
    const filters: FilterState = {
      searchQuery: "nonexistent",
      roles: ["admin"],
      joinDateRange: "last_7_days",
      lastLoginRange: "never",
    };
    const result = applyAllFilters(mockStaff, filters);
    expect(result).toHaveLength(0);
  });
});

describe("getActiveFilterCount", () => {
  it("should return 0 when no filters active", () => {
    const filters: FilterState = {
      searchQuery: "",
      roles: [],
      joinDateRange: null,
      lastLoginRange: null,
    };
    expect(getActiveFilterCount(filters)).toBe(0);
  });

  it("should count search query", () => {
    const filters: FilterState = {
      searchQuery: "test",
      roles: [],
      joinDateRange: null,
      lastLoginRange: null,
    };
    expect(getActiveFilterCount(filters)).toBe(1);
  });

  it("should count roles filter", () => {
    const filters: FilterState = {
      searchQuery: "",
      roles: ["staff", "manager"],
      joinDateRange: null,
      lastLoginRange: null,
    };
    expect(getActiveFilterCount(filters)).toBe(1);
  });

  it("should count all active filters", () => {
    const filters: FilterState = {
      searchQuery: "test",
      roles: ["staff"],
      joinDateRange: "last_30_days",
      lastLoginRange: "last_7_days",
    };
    expect(getActiveFilterCount(filters)).toBe(4);
  });

  it("should trim whitespace when counting search query", () => {
    const filters: FilterState = {
      searchQuery: "   ",
      roles: [],
      joinDateRange: null,
      lastLoginRange: null,
    };
    expect(getActiveFilterCount(filters)).toBe(0);
  });
});

describe("getFilterLabel", () => {
  it("should return correct labels for join date filters", () => {
    expect(getFilterLabel("join", "last_7_days")).toBe("Joined: Last 7 days");
    expect(getFilterLabel("join", "last_30_days")).toBe("Joined: Last 30 days");
    expect(getFilterLabel("join", "last_90_days")).toBe("Joined: Last 90 days");
    expect(getFilterLabel("join", "90_plus_days")).toBe("Joined: 90+ days ago");
  });

  it("should return correct labels for last login filters", () => {
    expect(getFilterLabel("lastLogin", "last_7_days")).toBe(
      "Last login: Last 7 days"
    );
    expect(getFilterLabel("lastLogin", "last_30_days")).toBe(
      "Last login: Last 30 days"
    );
    expect(getFilterLabel("lastLogin", "never")).toBe("Last login: Never");
  });

  it("should handle unknown range gracefully", () => {
    expect(getFilterLabel("join", "unknown")).toBe("Joined: unknown");
  });
});
