/**
 * Tests for GET /api/orders/history
 */

import { GET } from "@/app/api/orders/history/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../../__tests__/test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

describe("GET /api/orders/history", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("Successful Order Retrieval", () => {
    it("should return customer orders", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockOrders = [
        { id: "order-1", status: "completed", total_cents: 500 },
        { id: "order-2", status: "pending", total_cents: 300 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockOrders,
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toEqual(mockOrders);
    });

    it("should return empty array when no orders exist", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toEqual([]);
    });

    it("should call link_guest_orders for user with email", async () => {
      const mockUser = { ...mockUsers.customer, email: "customer@test.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabaseClient.rpc = mockRpc;

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      await GET();

      expect(mockRpc).toHaveBeenCalledWith("link_guest_orders", {
        p_email: "customer@test.com",
      });
    });

    it("should handle link_guest_orders errors gracefully", async () => {
      const mockUser = { ...mockUsers.customer, email: "customer@test.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toEqual([]);
    });

    it("should order results by created_at descending", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockOrderFn = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrderFn,
          }),
        }),
      });

      await GET();

      expect(mockOrderFn).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to load orders");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Unexpected error loading orders");
    });
  });
});
