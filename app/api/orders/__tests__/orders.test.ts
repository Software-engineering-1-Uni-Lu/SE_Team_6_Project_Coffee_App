/**
 * Tests for POST /api/orders
 *
 * PURPOSE:
 * Test order creation endpoint for both authenticated customers and guests
 *
 * COVERAGE:
 * - Authenticated customer orders
 * - Guest orders with required guest info
 * - Input validation (items, totals, payment_method required)
 * - Guest email/name validation
 * - Role-based authorization (customer role required for auth users)
 * - Schema validation (items array, payment methods, email format)
 * - Error handling for various failure scenarios
 * - No real database calls (mocked Supabase)
 */

import { POST } from "@/app/api/orders/route";
import {
  createMockRequest,
  createMockSupabaseClient,
  mockUsers,
  mockOrder,
  mockOrderItems,
} from "../../__tests__/test-utils";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock @supabase/ssr
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

// Mock anon client
jest.mock("@/src/integrations/supabase/anon", () => ({
  createAnonClient: jest.fn(),
}));

describe("POST /api/orders", () => {
  let mockSupabaseClient: any;
  let mockAnonClient: any;
  const { createServerClient } = require("@supabase/ssr");
  const { createAnonClient } = require("@/src/integrations/supabase/anon");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    mockAnonClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
    createAnonClient.mockReturnValue(mockAnonClient);
  });

  const validOrderData = {
    items: mockOrderItems,
    subtotal_cents: 650,
    tax_cents: 52,
    total_cents: 702,
    payment_method: "card",
  };

  describe("Input Validation", () => {
    it("should return 400 when items array is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          subtotal_cents: 650,
          tax_cents: 52,
          total_cents: 702,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Order must contain at least one item");
    });

    it("should return 400 when items array is empty", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: [],
          subtotal_cents: 650,
          tax_cents: 52,
          total_cents: 702,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Order must contain at least one item");
    });

    it("should return 400 when subtotal_cents is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: mockOrderItems,
          tax_cents: 52,
          total_cents: 702,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Order totals are required");
    });

    it("should return 400 when tax_cents is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: mockOrderItems,
          subtotal_cents: 650,
          total_cents: 702,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Order totals are required");
    });

    it("should return 400 when total_cents is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: mockOrderItems,
          subtotal_cents: 650,
          tax_cents: 52,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Order totals are required");
    });

    it("should return 400 when payment_method is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: mockOrderItems,
          subtotal_cents: 650,
          tax_cents: 52,
          total_cents: 702,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid payment method is required");
    });

    it("should return 400 when payment_method is invalid", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          items: mockOrderItems,
          subtotal_cents: 650,
          tax_cents: 52,
          total_cents: 702,
          payment_method: "crypto",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid payment method is required");
    });

    it("should accept card as valid payment method", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "card",
        },
      });

      const response = await POST(request);
      expect(response.status).not.toBe(400);
    });

    it("should accept cash as valid payment method", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "cash",
        },
      });

      const response = await POST(request);
      expect(response.status).not.toBe(400);
    });

    it("should accept loyalty_points as valid payment method", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "loyalty_points",
        },
      });

      const response = await POST(request);
      expect(response.status).not.toBe(400);
    });

    it("should return 400 for malformed JSON", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: null,
      });

      request.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid request body");
    });
  });

  describe("Authenticated Customer Orders", () => {
    it("should create order for authenticated customer", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.order).toEqual(mockOrder);
    });

    it("should create loyalty points order via RPC", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "loyalty_points",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "create_loyalty_points_order",
        expect.objectContaining({
          p_items: validOrderData.items,
        })
      );
      expect(response.status).toBe(201);
      expect(data.order).toEqual(mockOrder);
    });

    it("should return 403 when staff tries to place order", async () => {
      const mockUser = mockUsers.staff;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "No customer role found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("You must have a customer account");
    });

    it("should return 403 when manager tries to place order", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "No customer role found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("You must have a customer account");
    });

    it("should return 403 when admin tries to place order", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "No customer role found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("You must have a customer account");
    });
  });

  describe("Guest Orders", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockOrder,
          error: null,
        }),
      };
      mockAnonClient.from.mockReturnValue(mockFrom);
    });

    it("should create order for guest with valid email and name", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "John Doe",
          guest_email: "john@example.com",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.order).toBeDefined();
    });

    it("should return 400 when guest_email is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "John Doe",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required for guest orders");
    });

    it("should return 400 when guest_email is empty string", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "John Doe",
          guest_email: "   ",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required for guest orders");
    });

    it("should return 400 when guest_name is missing", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_email: "john@example.com",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name is required for guest orders");
    });

    it("should return 400 when guest_name is empty string", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "   ",
          guest_email: "john@example.com",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name is required for guest orders");
    });

    it("should return 400 for invalid email format", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "John Doe",
          guest_email: "invalid-email",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("should accept valid email formats", async () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.com",
      ];

      for (const email of validEmails) {
        const request = createMockRequest("http://localhost:3000/api/orders", {
          method: "POST",
          body: {
            ...validOrderData,
            guest_name: "John Doe",
            guest_email: email,
          },
        });

        const response = await POST(request);
        expect(response.status).not.toBe(400);
      }
    });

    it("should return 400 when guest uses loyalty_points", async () => {
      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "loyalty_points",
          guest_name: "John Doe",
          guest_email: "john@example.com",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Loyalty points require an authenticated account"
      );
    });

    it("should trim guest name and email", async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockOrder,
          error: null,
        }),
      };
      mockAnonClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          guest_name: "  John Doe  ",
          guest_email: "  john@example.com  ",
        },
      });

      await POST(request);

      // Verify insert was called with trimmed values
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          guest_name: "John Doe",
          guest_email: "john@example.com",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database insert fails", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("should return 400 when loyalty points are insufficient", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Insufficient points" },
      });

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: {
          ...validOrderData,
          payment_method: "loyalty_points",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Insufficient loyalty points for this order");
    });

    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Connection failed")
      );

      const request = createMockRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: validOrderData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
