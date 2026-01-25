/**
 * FilterBadges Component Tests
 *
 * FEATURE: CSA-207 - Search & Filter Staff Accounts
 *
 * REQUIREMENTS TESTED:
 * - FR11: View all active filters at a glance
 * - FR12: Remove individual active filters
 * - FR13: Clear all active filters with single action
 * - FR16: Display filtered result count
 * - NFR13: Visual consistency with design system
 * - NFR22: Keyboard navigation and accessibility
 */

import { render, screen, fireEvent } from "@testing-library/react";
import FilterBadges from "../admin/staff/FilterBadges";

describe("FilterBadges", () => {
  const mockCallbacks = {
    onClearSearch: jest.fn(),
    onRemoveRole: jest.fn(),
    onClearJoinDate: jest.fn(),
    onClearLastLogin: jest.fn(),
    onClearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("No Active Filters", () => {
    it("should display total count when no filters are active", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={10}
          totalCount={10}
        />
      );

      expect(
        screen.getByText("Showing all 10 staff members")
      ).toBeInTheDocument();
      expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
    });
  });

  describe("Search Filter Badge", () => {
    it("should display search badge when search query is active", () => {
      render(
        <FilterBadges
          searchQuery="john"
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByText('Search: "john"')).toBeInTheDocument();
    });

    it("should call onClearSearch when search badge is removed", () => {
      render(
        <FilterBadges
          searchQuery="john"
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      const removeButton = screen.getByLabelText(
        'Remove Search: "john" filter'
      );
      fireEvent.click(removeButton);

      expect(mockCallbacks.onClearSearch).toHaveBeenCalledTimes(1);
    });

    it("should not display search badge when query is empty", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={10}
          totalCount={10}
        />
      );

      expect(screen.queryByText(/Search:/)).not.toBeInTheDocument();
    });

    it("should not display search badge when query is only whitespace", () => {
      render(
        <FilterBadges
          searchQuery="   "
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={10}
          totalCount={10}
        />
      );

      expect(screen.queryByText(/Search:/)).not.toBeInTheDocument();
    });
  });

  describe("Role Filter Badges", () => {
    it("should display single role badge", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={["staff"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={5}
          totalCount={10}
        />
      );

      expect(screen.getByText("Role: Staff")).toBeInTheDocument();
    });

    it("should display multiple role badges", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={["staff", "manager", "admin"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={10}
          totalCount={10}
        />
      );

      expect(screen.getByText("Role: Staff")).toBeInTheDocument();
      expect(screen.getByText("Role: Manager")).toBeInTheDocument();
      expect(screen.getByText("Role: Admin")).toBeInTheDocument();
    });

    it("should capitalize role names correctly", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={["manager"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={2}
          totalCount={10}
        />
      );

      expect(screen.getByText("Role: Manager")).toBeInTheDocument();
    });

    it("should call onRemoveRole with correct role when badge is removed", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={["staff", "manager"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={8}
          totalCount={10}
        />
      );

      const staffRemoveButton = screen.getByLabelText(
        "Remove Role: Staff filter"
      );
      fireEvent.click(staffRemoveButton);

      expect(mockCallbacks.onRemoveRole).toHaveBeenCalledWith("staff");
      expect(mockCallbacks.onRemoveRole).toHaveBeenCalledTimes(1);
    });
  });

  describe("Join Date Filter Badge", () => {
    it("should display join date badge with correct label", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange="last_30_days"
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={3}
          totalCount={10}
        />
      );

      expect(screen.getByText("Joined: Last 30 days")).toBeInTheDocument();
    });

    it("should call onClearJoinDate when badge is removed", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange="last_7_days"
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      const removeButton = screen.getByLabelText(
        "Remove Joined: Last 7 days filter"
      );
      fireEvent.click(removeButton);

      expect(mockCallbacks.onClearJoinDate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Last Login Filter Badge", () => {
    it("should display last login badge with correct label", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange="last_7_days"
          {...mockCallbacks}
          resultCount={4}
          totalCount={10}
        />
      );

      expect(screen.getByText("Last login: Last 7 days")).toBeInTheDocument();
    });

    it('should display "Never" option correctly', () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange="never"
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByText("Last login: Never")).toBeInTheDocument();
    });

    it("should call onClearLastLogin when badge is removed", () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange="90_plus_days"
          {...mockCallbacks}
          resultCount={2}
          totalCount={10}
        />
      );

      const removeButton = screen.getByLabelText(
        "Remove Last login: 90+ days ago filter"
      );
      fireEvent.click(removeButton);

      expect(mockCallbacks.onClearLastLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe("Result Count Display", () => {
    it("should display correct result count with active filters", () => {
      render(
        <FilterBadges
          searchQuery="test"
          roles={["staff"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={3}
          totalCount={10}
        />
      );

      expect(
        screen.getByText("Showing 3 of 10 staff members")
      ).toBeInTheDocument();
    });

    it("should update when counts change", () => {
      const { rerender } = render(
        <FilterBadges
          searchQuery="test"
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={5}
          totalCount={10}
        />
      );

      expect(
        screen.getByText("Showing 5 of 10 staff members")
      ).toBeInTheDocument();

      rerender(
        <FilterBadges
          searchQuery="test"
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={2}
          totalCount={10}
        />
      );

      expect(
        screen.getByText("Showing 2 of 10 staff members")
      ).toBeInTheDocument();
    });
  });

  describe("Clear All Filters", () => {
    it('should display "Clear all filters" button when filters are active', () => {
      render(
        <FilterBadges
          searchQuery="test"
          roles={["staff"]}
          joinDateRange="last_30_days"
          lastLoginRange="last_7_days"
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });

    it('should call onClearAll when "Clear all filters" is clicked', () => {
      render(
        <FilterBadges
          searchQuery="test"
          roles={["staff"]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={2}
          totalCount={10}
        />
      );

      const clearAllButton = screen.getByText("Clear all filters");
      fireEvent.click(clearAllButton);

      expect(mockCallbacks.onClearAll).toHaveBeenCalledTimes(1);
    });

    it('should not display "Clear all" when no filters are active', () => {
      render(
        <FilterBadges
          searchQuery=""
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={10}
          totalCount={10}
        />
      );

      expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Active Filters", () => {
    it("should display all active filter badges simultaneously", () => {
      render(
        <FilterBadges
          searchQuery="john"
          roles={["staff", "manager"]}
          joinDateRange="last_30_days"
          lastLoginRange="last_7_days"
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByText('Search: "john"')).toBeInTheDocument();
      expect(screen.getByText("Role: Staff")).toBeInTheDocument();
      expect(screen.getByText("Role: Manager")).toBeInTheDocument();
      expect(screen.getByText("Joined: Last 30 days")).toBeInTheDocument();
      expect(screen.getByText("Last login: Last 7 days")).toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 of 10 staff members")
      ).toBeInTheDocument();
      expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-labels on all remove buttons", () => {
      render(
        <FilterBadges
          searchQuery="test"
          roles={["staff"]}
          joinDateRange="last_30_days"
          lastLoginRange="last_7_days"
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      expect(
        screen.getByLabelText('Remove Search: "test" filter')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Remove Role: Staff filter")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Remove Joined: Last 30 days filter")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Remove Last login: Last 7 days filter")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      render(
        <FilterBadges
          searchQuery="test"
          roles={[]}
          joinDateRange={null}
          lastLoginRange={null}
          {...mockCallbacks}
          resultCount={1}
          totalCount={10}
        />
      );

      const removeButton = screen.getByLabelText(
        'Remove Search: "test" filter'
      );

      // Should be focusable
      removeButton.focus();
      expect(document.activeElement).toBe(removeButton);
    });
  });
});
