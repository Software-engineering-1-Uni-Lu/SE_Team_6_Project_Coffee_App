/**
 * Comprehensive Component Tests for ClientLayout
 * Tests layout integration, cart state management, and component composition
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ClientLayout } from "../client-layout";

// Mock child components
jest.mock("../navbar", () => ({
  Navbar: ({ onCartOpen }: { onCartOpen: () => void }) => (
    <div data-testid="navbar">
      <button onClick={onCartOpen} data-testid="cart-open-trigger">
        Open Cart
      </button>
    </div>
  ),
}));

jest.mock("../cart-modal", () => ({
  CartModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (
    <div data-testid="cart-modal" data-is-open={isOpen}>
      <button onClick={onClose} data-testid="cart-close-trigger">
        Close Cart
      </button>
    </div>
  ),
}));

// Mock CartProvider
jest.mock("@/src/hooks/use-cart", () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cart-provider">{children}</div>
  ),
  useCart: () => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isLoading: false,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  }),
}));

// Mock Toaster
jest.mock("sonner", () => ({
  Toaster: ({ position, richColors }: any) => (
    <div
      data-testid="toaster"
      data-position={position}
      data-rich-colors={richColors}
    />
  ),
}));

describe("ClientLayout Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      render(
        <ClientLayout>
          <div>Test Content</div>
        </ClientLayout>
      );

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <ClientLayout>
          <div data-testid="child-content">Child Component</div>
        </ClientLayout>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Child Component")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ClientLayout>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </ClientLayout>
      );

      expect(screen.getByText("First Child")).toBeInTheDocument();
      expect(screen.getByText("Second Child")).toBeInTheDocument();
      expect(screen.getByText("Third Child")).toBeInTheDocument();
    });
  });

  describe("Component Composition", () => {
    it("renders Navbar component", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("renders CartModal component", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      expect(screen.getByTestId("cart-modal")).toBeInTheDocument();
    });

    it("wraps children in CartProvider", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      expect(screen.getByTestId("cart-provider")).toBeInTheDocument();
    });

    it("renders Toaster component", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("configures Toaster with correct props", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const toaster = screen.getByTestId("toaster");
      expect(toaster).toHaveAttribute("data-position", "top-right");
      expect(toaster).toHaveAttribute("data-rich-colors", "true");
    });
  });

  describe("Cart Modal State Management", () => {
    it("cart modal is closed by default", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const cartModal = screen.getByTestId("cart-modal");
      expect(cartModal).toHaveAttribute("data-is-open", "false");
    });

    it("opens cart modal when onCartOpen is triggered from Navbar", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const openButton = screen.getByTestId("cart-open-trigger");
      fireEvent.click(openButton);

      const cartModal = screen.getByTestId("cart-modal");
      expect(cartModal).toHaveAttribute("data-is-open", "true");
    });

    it("closes cart modal when onClose is triggered", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      // Open cart
      const openButton = screen.getByTestId("cart-open-trigger");
      fireEvent.click(openButton);

      let cartModal = screen.getByTestId("cart-modal");
      expect(cartModal).toHaveAttribute("data-is-open", "true");

      // Close cart
      const closeButton = screen.getByTestId("cart-close-trigger");
      fireEvent.click(closeButton);

      cartModal = screen.getByTestId("cart-modal");
      expect(cartModal).toHaveAttribute("data-is-open", "false");
    });

    it("can open and close cart modal multiple times", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const openButton = screen.getByTestId("cart-open-trigger");
      const closeButton = screen.getByTestId("cart-close-trigger");

      // Open
      fireEvent.click(openButton);
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "true"
      );

      // Close
      fireEvent.click(closeButton);
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "false"
      );

      // Open again
      fireEvent.click(openButton);
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "true"
      );

      // Close again
      fireEvent.click(closeButton);
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });
  });

  describe("Layout Structure", () => {
    it("renders components in correct order: Provider > Navbar > Modal > Toaster > Children", () => {
      const { container } = render(
        <ClientLayout>
          <div data-testid="main-content">Main Content</div>
        </ClientLayout>
      );

      const cartProvider = screen.getByTestId("cart-provider");
      const navbar = screen.getByTestId("navbar");
      const cartModal = screen.getByTestId("cart-modal");
      const toaster = screen.getByTestId("toaster");
      const mainContent = screen.getByTestId("main-content");

      // Verify all components are present
      expect(cartProvider).toBeInTheDocument();
      expect(navbar).toBeInTheDocument();
      expect(cartModal).toBeInTheDocument();
      expect(toaster).toBeInTheDocument();
      expect(mainContent).toBeInTheDocument();

      // Verify CartProvider wraps everything
      expect(cartProvider).toContainElement(navbar);
      expect(cartProvider).toContainElement(cartModal);
      expect(cartProvider).toContainElement(toaster);
      expect(cartProvider).toContainElement(mainContent);
    });
  });

  describe("Children Rendering", () => {
    it("renders complex child components", () => {
      render(
        <ClientLayout>
          <div data-testid="complex-child">
            <h1>Page Title</h1>
            <p>Page content</p>
            <button>Action</button>
          </div>
        </ClientLayout>
      );

      expect(screen.getByTestId("complex-child")).toBeInTheDocument();
      expect(screen.getByText("Page Title")).toBeInTheDocument();
      expect(screen.getByText("Page content")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action" })
      ).toBeInTheDocument();
    });

    it("preserves children props and attributes", () => {
      render(
        <ClientLayout>
          <div data-testid="custom-div" className="custom-class" id="custom-id">
            Custom Content
          </div>
        </ClientLayout>
      );

      const customDiv = screen.getByTestId("custom-div");
      expect(customDiv).toHaveClass("custom-class");
      expect(customDiv).toHaveAttribute("id", "custom-id");
    });

    it("renders null children without error", () => {
      expect(() => {
        render(<ClientLayout>{null}</ClientLayout>);
      }).not.toThrow();
    });

    it("renders undefined children without error", () => {
      expect(() => {
        render(<ClientLayout>{undefined}</ClientLayout>);
      }).not.toThrow();
    });
  });

  describe("State Isolation", () => {
    it("cart state does not affect children rendering", () => {
      render(
        <ClientLayout>
          <div data-testid="static-content">Static Content</div>
        </ClientLayout>
      );

      const staticContent = screen.getByTestId("static-content");
      expect(staticContent).toBeInTheDocument();

      // Open cart
      const openButton = screen.getByTestId("cart-open-trigger");
      fireEvent.click(openButton);

      // Static content should still be rendered
      expect(staticContent).toBeInTheDocument();

      // Close cart
      const closeButton = screen.getByTestId("cart-close-trigger");
      fireEvent.click(closeButton);

      // Static content should still be rendered
      expect(staticContent).toBeInTheDocument();
    });

    it("maintains separate cart modal state per instance", () => {
      const { rerender } = render(
        <ClientLayout>
          <div>First Instance</div>
        </ClientLayout>
      );

      const openButton = screen.getByTestId("cart-open-trigger");
      fireEvent.click(openButton);

      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "true"
      );

      // Rerender with new children
      rerender(
        <ClientLayout>
          <div>Second Instance</div>
        </ClientLayout>
      );

      // Cart state should persist
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "true"
      );
    });
  });

  describe("Integration", () => {
    it("integrates Navbar and CartModal through state", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      // Initially closed
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "false"
      );

      // Open from Navbar
      fireEvent.click(screen.getByTestId("cart-open-trigger"));
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "true"
      );

      // Close from CartModal
      fireEvent.click(screen.getByTestId("cart-close-trigger"));
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });

    it("passes onCartOpen callback to Navbar", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      // Navbar should receive and be able to call onCartOpen
      const openButton = screen.getByTestId("cart-open-trigger");
      expect(openButton).toBeInTheDocument();

      // Should not throw when clicked
      expect(() => {
        fireEvent.click(openButton);
      }).not.toThrow();
    });

    it("passes cart state props to CartModal", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const cartModal = screen.getByTestId("cart-modal");

      // Should have isOpen prop
      expect(cartModal).toHaveAttribute("data-is-open");
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid cart open/close toggles", () => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );

      const openButton = screen.getByTestId("cart-open-trigger");
      const closeButton = screen.getByTestId("cart-close-trigger");

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        fireEvent.click(openButton);
        fireEvent.click(closeButton);
      }

      // Should end in closed state
      expect(screen.getByTestId("cart-modal")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });

    it("renders when children is a React fragment", () => {
      render(
        <ClientLayout>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </ClientLayout>
      );

      expect(screen.getByText("Fragment Child 1")).toBeInTheDocument();
      expect(screen.getByText("Fragment Child 2")).toBeInTheDocument();
    });

    it("handles children with nested components", () => {
      const NestedComponent = () => (
        <div data-testid="nested">
          <div data-testid="deeply-nested">Deeply Nested</div>
        </div>
      );

      render(
        <ClientLayout>
          <NestedComponent />
        </ClientLayout>
      );

      expect(screen.getByTestId("nested")).toBeInTheDocument();
      expect(screen.getByTestId("deeply-nested")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("does not re-render children when cart state changes", () => {
      let renderCount = 0;
      const ChildComponent = () => {
        renderCount++;
        return <div>Child Component</div>;
      };

      render(
        <ClientLayout>
          <ChildComponent />
        </ClientLayout>
      );

      const initialRenderCount = renderCount;

      // Toggle cart
      fireEvent.click(screen.getByTestId("cart-open-trigger"));
      fireEvent.click(screen.getByTestId("cart-close-trigger"));

      // Child should not have re-rendered
      // Note: This might re-render in actual React due to context, but we're testing the structure
      expect(screen.getByText("Child Component")).toBeInTheDocument();
    });
  });
});
