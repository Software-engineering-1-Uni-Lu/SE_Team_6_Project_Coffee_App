/**
 * Comprehensive Component Tests for Navbar
 * Tests role-based rendering, authentication states, and user interactions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Navbar } from "../navbar";
import type { User } from "@supabase/supabase-js";

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRouter = { push: mockPush };

// Mock the hooks
let mockUseCart = {
  totalItems: 0,
  items: [],
  totalPrice: 0,
  isLoading: false,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

let mockUseUser = {
  user: null as User | null,
  role: "customer" as "customer" | "staff" | "manager" | "admin",
  loading: false,
  isBlocked: false,
  refetch: jest.fn(),
};

jest.mock("@/src/hooks/use-cart", () => ({
  useCart: () => mockUseCart,
}));

jest.mock("@/src/hooks/useUser", () => ({
  useUser: () => mockUseUser,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock fetch for logout
global.fetch = jest.fn();

describe("Navbar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart = {
      totalItems: 0,
      items: [],
      totalPrice: 0,
      isLoading: false,
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
    };
    mockUseUser = {
      user: null,
      role: "customer",
      loading: false,
      isBlocked: false,
      refetch: jest.fn(),
    };
  });

  describe("Basic Rendering", () => {
    it("renders the cafe name", () => {
      const mockOnCartOpen = jest.fn();
      render(<Navbar onCartOpen={mockOnCartOpen} />);

      const cafeName = screen.getByText("Café Aroma");
      expect(cafeName).toBeInTheDocument();
    });

    it("renders as a navigation landmark", () => {
      const mockOnCartOpen = jest.fn();
      render(<Navbar onCartOpen={mockOnCartOpen} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("accepts onCartOpen prop without crashing", () => {
      const mockOnCartOpen = jest.fn();

      expect(() => {
        render(<Navbar onCartOpen={mockOnCartOpen} />);
      }).not.toThrow();
    });
  });

  describe("Guest/Unauthenticated User View", () => {
    beforeEach(() => {
      mockUseUser.user = null;
      mockUseUser.role = "customer";
    });

    it("shows Menu link for guest users", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const menuLink = screen.getByRole("link", { name: /menu/i });
      expect(menuLink).toBeInTheDocument();
      expect(menuLink).toHaveAttribute("href", "/menu");
    });

    it("shows Cart button for guest users", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const cartButton = screen.getByRole("button", { name: /cart/i });
      expect(cartButton).toBeInTheDocument();
    });

    it("shows Login and Register links", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const loginLink = screen.getByRole("link", { name: /login/i });
      const registerLink = screen.getByRole("link", { name: /register/i });

      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });

    it("does not show role-specific dropdowns", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(screen.queryByText("Customer")).not.toBeInTheDocument();
      expect(screen.queryByText("Staff")).not.toBeInTheDocument();
      expect(screen.queryByText("Manager")).not.toBeInTheDocument();
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("calls onCartOpen when cart button is clicked", () => {
      const mockOnCartOpen = jest.fn();
      render(<Navbar onCartOpen={mockOnCartOpen} />);

      const cartButton = screen.getByRole("button", { name: /cart/i });
      fireEvent.click(cartButton);

      expect(mockOnCartOpen).toHaveBeenCalledTimes(1);
    });

    it("displays cart badge with item count when cart has items", () => {
      mockUseCart.totalItems = 3;
      render(<Navbar onCartOpen={jest.fn()} />);

      const badge = screen.getByText("3");
      expect(badge).toBeInTheDocument();
    });

    it("does not display cart badge when cart is empty", () => {
      mockUseCart.totalItems = 0;
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("Customer Role View", () => {
    beforeEach(() => {
      mockUseUser.user = {
        id: "customer-123",
        email: "customer@test.com",
      } as unknown as User;
      mockUseUser.role = "customer";
    });

    it("shows Menu link for customers", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const menuLink = screen.getByRole("link", { name: /^menu$/i });
      expect(menuLink).toBeInTheDocument();
    });

    it("shows Customer dropdown button", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const customerButton = screen.getByRole("button", { name: /customer/i });
      expect(customerButton).toBeInTheDocument();
    });

    it("shows Cart and Checkout for customers", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const cartButton = screen.getByRole("button", { name: /cart/i });
      const checkoutLink = screen.getByRole("link", { name: /checkout/i });

      expect(cartButton).toBeInTheDocument();
      expect(checkoutLink).toBeInTheDocument();
      expect(checkoutLink).toHaveAttribute("href", "/checkout");
    });

    it("shows Profile and Logout buttons for authenticated customers", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const profileLink = screen.getByRole("link", { name: /profile/i });
      const logoutButton = screen.getByRole("button", { name: /logout/i });

      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute("href", "/auth/profile");
      expect(logoutButton).toBeInTheDocument();
    });

    it("does not show Login/Register for authenticated customers", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("link", { name: /login/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /register/i })
      ).not.toBeInTheDocument();
    });

    it("does not show Staff/Manager/Admin dropdowns for customers", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /^staff$/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /manager/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /admin/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Staff Role View", () => {
    beforeEach(() => {
      mockUseUser.user = {
        id: "staff-123",
        email: "staff@test.com",
      } as unknown as User;
      mockUseUser.role = "staff";
    });

    it("shows Staff dropdown button", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const staffButton = screen.getByRole("button", { name: /^staff$/i });
      expect(staffButton).toBeInTheDocument();
    });

    it("does not show customer Menu link for staff", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      // Customer menu link in main nav should not be visible for staff
      // (Staff has their own "Menu" in Staff dropdown)
      const menuLinks = screen.queryAllByRole("link", { name: /menu/i });
      // Should not have the main customer menu link (only staff menu in dropdown)
      const hasMainMenuLink = menuLinks.some((link) => {
        const parent = link.parentElement;
        return (
          parent?.classList.contains("flex") &&
          parent?.classList.contains("items-center")
        );
      });
      expect(hasMainMenuLink).toBe(false);
    });

    it("does not show Cart and Checkout for staff", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /cart/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /checkout/i })
      ).not.toBeInTheDocument();
    });

    it("shows Profile and Logout buttons for staff", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const profileLink = screen.getByRole("link", { name: /profile/i });
      const logoutButton = screen.getByRole("button", { name: /logout/i });

      expect(profileLink).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
    });

    it("does not show Customer or Admin dropdowns for staff", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /customer/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /manager/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /admin/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Manager Role View", () => {
    beforeEach(() => {
      mockUseUser.user = {
        id: "manager-123",
        email: "manager@test.com",
      } as unknown as User;
      mockUseUser.role = "manager";
    });

    it("shows Manager dropdown button", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const managerButton = screen.getByRole("button", { name: /manager/i });
      expect(managerButton).toBeInTheDocument();
    });

    it("shows Staff dropdown for manager", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const staffButton = screen.getByRole("button", { name: /^staff$/i });
      expect(staffButton).toBeInTheDocument();
    });

    it("does not show Cart and Checkout for manager", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /cart/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /checkout/i })
      ).not.toBeInTheDocument();
    });

    it("does not show Customer dropdown for manager", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /customer/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Admin Role View", () => {
    beforeEach(() => {
      mockUseUser.user = {
        id: "admin-123",
        email: "admin@test.com",
      } as unknown as User;
      mockUseUser.role = "admin";
    });

    it("shows Admin dropdown button", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const adminButton = screen.getByRole("button", { name: /admin/i });
      expect(adminButton).toBeInTheDocument();
    });

    it("shows Staff dropdown for admin", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      const staffButton = screen.getByRole("button", { name: /^staff$/i });
      expect(staffButton).toBeInTheDocument();
    });

    it("does not show Cart, Checkout, or Customer dropdown for admin", () => {
      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("button", { name: /cart/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /checkout/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /customer/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    beforeEach(() => {
      mockUseUser.user = {
        id: "user-123",
        email: "user@test.com",
      } as unknown as User;
      mockUseUser.role = "customer";
    });

    it("calls logout API when logout button is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      render(<Navbar onCartOpen={jest.fn()} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
          method: "POST",
        });
      });
    });

    it("shows 'Logging out...' text while logout is in progress", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<Navbar onCartOpen={jest.fn()} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText("Logging out...")).toBeInTheDocument();
      });
    });

    it("disables logout button while logging out", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<Navbar onCartOpen={jest.fn()} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        const disabledButton = screen.getByRole("button", {
          name: /logging out/i,
        });
        expect(disabledButton).toBeDisabled();
      });
    });

    it("handles logout error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      render(<Navbar onCartOpen={jest.fn()} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Button should be enabled again after error
      await waitFor(() => {
        expect(logoutButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Loading State", () => {
    it("does not show Login/Register while loading", () => {
      mockUseUser.loading = true;
      mockUseUser.user = null;

      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("link", { name: /login/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /register/i })
      ).not.toBeInTheDocument();
    });

    it("does not show Profile/Logout while loading", () => {
      mockUseUser.loading = true;
      mockUseUser.user = {
        id: "user-123",
        email: "user@test.com",
      } as unknown as User;

      render(<Navbar onCartOpen={jest.fn()} />);

      expect(
        screen.queryByRole("link", { name: /profile/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /logout/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("cart button is keyboard accessible", () => {
      const mockOnCartOpen = jest.fn();
      render(<Navbar onCartOpen={mockOnCartOpen} />);

      const cartButton = screen.getByRole("button", { name: /cart/i });
      cartButton.focus();

      expect(document.activeElement).toBe(cartButton);
    });

    it("all navigation links are accessible by role", () => {
      mockUseUser.user = null;
      render(<Navbar onCartOpen={jest.fn()} />);

      // Should be able to find all links by role
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });

    it("buttons have accessible names", () => {
      mockUseUser.user = null;
      render(<Navbar onCartOpen={jest.fn()} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });
  });
});
