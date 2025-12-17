/**
 * Component Unit Test Example
 * Tests the Navbar component rendering and basic functionality
 */

import { render, screen } from "@testing-library/react";
import { Navbar } from "../navbar";

// Mock the hooks
jest.mock("../../hooks/use-cart", () => ({
  useCart: () => ({
    totalItems: 2,
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  }),
}));

jest.mock("../../hooks/useUser", () => ({
  useUser: () => ({
    user: null,
    role: null,
    loading: false,
  }),
}));

describe("Navbar Component", () => {
  it("renders the cafe name", () => {
    const mockOnCartOpen = jest.fn();
    render(<Navbar onCartOpen={mockOnCartOpen} />);

    const cafeName = screen.getByText("Café Aroma");
    expect(cafeName).toBeInTheDocument();
  });

  it("renders as a nav element", () => {
    const mockOnCartOpen = jest.fn();
    const { container } = render(<Navbar onCartOpen={mockOnCartOpen} />);

    const navElement = container.querySelector("nav");
    expect(navElement).toBeInTheDocument();
  });

  it("accepts onCartOpen prop without crashing", () => {
    const mockOnCartOpen = jest.fn();

    expect(() => {
      render(<Navbar onCartOpen={mockOnCartOpen} />);
    }).not.toThrow();
  });
});
