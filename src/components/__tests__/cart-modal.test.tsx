/**
 * Comprehensive Component Tests for CartModal
 * Tests modal state, cart items display, user interactions, and accessibility
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { CartModal } from "../cart-modal";
import type { CartItem } from "@/src/types/cart";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, fill, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock the useCart hook
let mockUseCart = {
  items: [] as CartItem[],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock("@/src/hooks/use-cart", () => ({
  useCart: () => mockUseCart,
}));

describe("CartModal Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      isLoading: false,
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
    };
  });

  describe("Modal Visibility", () => {
    it("does not render when isOpen is false", () => {
      const { container } = render(
        <CartModal isOpen={false} onClose={jest.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders when isOpen is true", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const heading = screen.getByRole("heading", { name: /cart \(0\)/i });
      expect(heading).toBeInTheDocument();
    });

    it("renders backdrop overlay when open", () => {
      const { container } = render(
        <CartModal isOpen={true} onClose={jest.fn()} />
      );

      const backdrop = container.querySelector(".fixed.inset-0.bg-black");
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe("Empty Cart State", () => {
    beforeEach(() => {
      mockUseCart.items = [];
      mockUseCart.totalItems = 0;
      mockUseCart.totalPrice = 0;
    });

    it("displays empty cart message when no items", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
      expect(
        screen.getByText("Add some delicious items from our menu")
      ).toBeInTheDocument();
    });

    it("shows empty cart icon", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("🛒")).toBeInTheDocument();
    });

    it("displays Browse Menu button when cart is empty", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const browseButton = screen.getByRole("link", {
        name: /browse menu/i,
      });
      expect(browseButton).toBeInTheDocument();
      expect(browseButton).toHaveAttribute("href", "/menu");
    });

    it("closes modal when Browse Menu button is clicked", () => {
      const mockOnClose = jest.fn();
      render(<CartModal isOpen={true} onClose={mockOnClose} />);

      const browseButton = screen.getByRole("link", {
        name: /browse menu/i,
      });
      fireEvent.click(browseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not show checkout section when cart is empty", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(
        screen.queryByRole("link", { name: /proceed to checkout/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Cart with Items", () => {
    const mockCartItems: CartItem[] = [
      {
        cartItemId: "item-1",
        productId: "prod-1",
        name: "Espresso",
        price: 350, // 3.50 EUR in cents
        basePrice: 350,
        quantity: 2,
        imageUrl: "/images/espresso.jpg",
        modifiers: [],
      },
      {
        cartItemId: "item-2",
        productId: "prod-2",
        name: "Latte",
        price: 500, // 5.00 EUR in cents
        basePrice: 450,
        quantity: 1,
        imageUrl: null,
        modifiers: [{ label: "Extra Shot", price: 50 }],
      },
    ];

    beforeEach(() => {
      mockUseCart.items = mockCartItems;
      mockUseCart.totalItems = 3;
      mockUseCart.totalPrice = 1200; // 12.00 EUR in cents
    });

    it("displays correct item count in heading", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(
        screen.getByRole("heading", { name: /cart \(3\)/i })
      ).toBeInTheDocument();
    });

    it("renders all cart items", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("Espresso")).toBeInTheDocument();
      expect(screen.getByText("Latte")).toBeInTheDocument();
    });

    it("displays item prices", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("€3.50")).toBeInTheDocument();
      expect(screen.getByText("€5.00")).toBeInTheDocument();
    });

    it("displays item quantities", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const quantities = screen.getAllByText("2");
      expect(quantities.length).toBeGreaterThan(0);

      const quantity1 = screen.getByText("1");
      expect(quantity1).toBeInTheDocument();
    });

    it("shows item image when imageUrl is provided", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const espressoImage = screen.getByAltText("Espresso");
      expect(espressoImage).toBeInTheDocument();
      expect(espressoImage).toHaveAttribute("src", "/images/espresso.jpg");
    });

    it("shows coffee emoji fallback when no image", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const emojiElements = screen.getAllByText("☕");
      expect(emojiElements.length).toBeGreaterThan(0);
    });

    it("displays modifiers when present", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("+ Extra Shot")).toBeInTheDocument();
    });

    it("displays total price", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("€12.00")).toBeInTheDocument();
    });

    it("shows Proceed to Checkout button", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const checkoutLink = screen.getByRole("link", {
        name: /proceed to checkout/i,
      });
      expect(checkoutLink).toBeInTheDocument();
      expect(checkoutLink).toHaveAttribute("href", "/checkout");
    });
  });

  describe("Quantity Controls", () => {
    const mockItem: CartItem = {
      cartItemId: "item-1",
      productId: "prod-1",
      name: "Cappuccino",
      price: 400,
      basePrice: 400,
      quantity: 5,
      imageUrl: null,
      modifiers: [],
    };

    beforeEach(() => {
      mockUseCart.items = [mockItem];
      mockUseCart.totalItems = 5;
      mockUseCart.totalPrice = 20.0;
    });

    it("has decrement button for each item", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const decrementButtons = screen.getAllByRole("button", { name: "−" });
      expect(decrementButtons.length).toBeGreaterThan(0);
    });

    it("has increment button for each item", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const incrementButtons = screen.getAllByRole("button", { name: "+" });
      expect(incrementButtons.length).toBeGreaterThan(0);
    });

    it("calls updateQuantity with decreased value when decrement clicked", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const decrementButton = screen.getByRole("button", { name: "−" });
      fireEvent.click(decrementButton);

      expect(mockUseCart.updateQuantity).toHaveBeenCalledWith("item-1", 4);
    });

    it("calls updateQuantity with increased value when increment clicked", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const incrementButton = screen.getByRole("button", { name: "+" });
      fireEvent.click(incrementButton);

      expect(mockUseCart.updateQuantity).toHaveBeenCalledWith("item-1", 6);
    });

    it("disables increment button when quantity is 50", () => {
      mockUseCart.items = [
        {
          ...mockItem,
          quantity: 50,
        },
      ];

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const incrementButton = screen.getByRole("button", { name: "+" });
      expect(incrementButton).toBeDisabled();
    });

    it("does not disable increment button when quantity is below 50", () => {
      mockUseCart.items = [
        {
          ...mockItem,
          quantity: 49,
        },
      ];

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const incrementButton = screen.getByRole("button", { name: "+" });
      expect(incrementButton).not.toBeDisabled();
    });
  });

  describe("Remove Item", () => {
    const mockItem: CartItem = {
      cartItemId: "item-1",
      productId: "prod-1",
      name: "Americano",
      price: 300,
      basePrice: 300,
      quantity: 1,
      imageUrl: null,
      modifiers: [],
    };

    beforeEach(() => {
      mockUseCart.items = [mockItem];
      mockUseCart.totalItems = 1;
      mockUseCart.totalPrice = 3.0;
    });

    it("has Remove button for each item", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const removeButton = screen.getByRole("button", { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
    });

    it("calls removeItem with correct cartItemId when Remove clicked", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const removeButton = screen.getByRole("button", { name: /remove/i });
      fireEvent.click(removeButton);

      expect(mockUseCart.removeItem).toHaveBeenCalledWith("item-1");
    });
  });

  describe("Close Modal", () => {
    it("has close button (×) in header", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      expect(closeButton).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const mockOnClose = jest.fn();
      render(<CartModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: "✕" });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <CartModal isOpen={true} onClose={mockOnClose} />
      );

      const backdrop = container.querySelector(".fixed.inset-0.bg-black");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("closes modal when Proceed to Checkout is clicked", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Coffee",
          price: 300,
          basePrice: 300,
          quantity: 1,
          imageUrl: null,
          modifiers: [],
        },
      ];
      mockUseCart.totalItems = 1;
      mockUseCart.totalPrice = 3.0;

      const mockOnClose = jest.fn();
      render(<CartModal isOpen={true} onClose={mockOnClose} />);

      const checkoutLink = screen.getByRole("link", {
        name: /proceed to checkout/i,
      });
      fireEvent.click(checkoutLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multiple Items with Different Configurations", () => {
    const complexCartItems: CartItem[] = [
      {
        cartItemId: "item-1",
        productId: "prod-1",
        name: "Espresso",
        price: 350,
        basePrice: 350,
        quantity: 1,
        imageUrl: "/images/espresso.jpg",
        modifiers: [],
      },
      {
        cartItemId: "item-2",
        productId: "prod-1",
        name: "Espresso",
        price: 400,
        basePrice: 350,
        quantity: 2,
        imageUrl: "/images/espresso.jpg",
        modifiers: [{ label: "Extra Shot", price: 0.5 }],
      },
      {
        cartItemId: "item-3",
        productId: "prod-2",
        name: "Iced Latte",
        price: 650,
        basePrice: 500,
        quantity: 1,
        imageUrl: null,
        modifiers: [
          { label: "Oat Milk", price: 1.0 },
          { label: "Vanilla Syrup", price: 0.5 },
        ],
      },
    ];

    beforeEach(() => {
      mockUseCart.items = complexCartItems;
      mockUseCart.totalItems = 4;
      mockUseCart.totalPrice = 15.5;
    });

    it("renders all items with different modifiers separately", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      // Both Espresso items should be listed
      const espressoItems = screen.getAllByText("Espresso");
      expect(espressoItems.length).toBe(2);

      expect(screen.getByText("Iced Latte")).toBeInTheDocument();
    });

    it("displays all modifiers for items with multiple modifiers", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("+ Oat Milk")).toBeInTheDocument();
      expect(screen.getByText("+ Vanilla Syrup")).toBeInTheDocument();
    });

    it("has separate Remove buttons for each cart item", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons.length).toBe(3);
    });

    it("has separate quantity controls for each cart item", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const incrementButtons = screen.getAllByRole("button", { name: "+" });
      const decrementButtons = screen.getAllByRole("button", { name: "−" });

      expect(incrementButtons.length).toBe(3);
      expect(decrementButtons.length).toBe(3);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Coffee",
          price: 300,
          basePrice: 300,
          quantity: 1,
          imageUrl: null,
          modifiers: [],
        },
      ];
      mockUseCart.totalItems = 1;
      mockUseCart.totalPrice = 3.0;
    });

    it("has accessible heading", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveAccessibleName();
      expect(heading).toHaveTextContent(/cart \(\d+\)/i);
    });

    it("all buttons have accessible names", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("checkout link is keyboard accessible", () => {
      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const checkoutLink = screen.getByRole("link", {
        name: /proceed to checkout/i,
      });

      checkoutLink.focus();
      expect(document.activeElement).toBe(checkoutLink);
    });

    it("images have alt text", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Espresso",
          price: 350,
          basePrice: 350,
          quantity: 1,
          imageUrl: "/images/espresso.jpg",
          modifiers: [],
        },
      ];

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      const image = screen.getByAltText("Espresso");
      expect(image).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles item with no modifiers gracefully", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Black Coffee",
          price: 250,
          basePrice: 250,
          quantity: 1,
          imageUrl: null,
          modifiers: [],
        },
      ];

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText("Black Coffee")).toBeInTheDocument();
    });

    it("handles item with undefined modifiers gracefully", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Tea",
          price: 200,
          basePrice: 200,
          quantity: 1,
          imageUrl: null,
          modifiers: undefined,
        },
      ];

      expect(() => {
        render(<CartModal isOpen={true} onClose={jest.fn()} />);
      }).not.toThrow();
    });

    it("handles very long item names", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Extra Large Caramel Macchiato with Extra Foam and Whipped Cream",
          price: 750,
          basePrice: 750,
          quantity: 1,
          imageUrl: null,
          modifiers: [],
        },
      ];

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(
        screen.getByText(
          "Extra Large Caramel Macchiato with Extra Foam and Whipped Cream"
        )
      ).toBeInTheDocument();
    });

    it("handles large quantities correctly", () => {
      mockUseCart.items = [
        {
          cartItemId: "item-1",
          productId: "prod-1",
          name: "Coffee",
          price: 300,
          basePrice: 300,
          quantity: 50,
          imageUrl: null,
          modifiers: [],
        },
      ];
      mockUseCart.totalItems = 50;

      render(<CartModal isOpen={true} onClose={jest.fn()} />);

      expect(
        screen.getByRole("heading", { name: /cart \(50\)/i })
      ).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });
  });
});
