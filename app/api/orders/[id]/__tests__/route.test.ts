/**
 * Tests for PATCH /api/orders/[id]
 */

import { PATCH } from "@/app/api/orders/[id]/route";
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

const mockParams = Promise.resolve({ id: "order-123" });

describe("PATCH /api/orders/[id]", () => {
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

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("Role Authorization", () => {
    it("should return 403 for customer", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "Only staff, admin, and manager can update orders"
      );
    });

    it("should return 403 for manager", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "Only staff, admin, and manager can update orders"
      );
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when status is missing", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "staff" },
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: {},
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Status is required");
    });

    it("should return 400 for invalid status", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "staff" },
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "invalid-status" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });
  });

  describe("Successful Updates", () => {
    it("should allow staff to update order status", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      const mockOrder = { id: "order-123", status: "confirmed" };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "staff" },
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toEqual(mockOrder);
    });

    it("should allow admin to update order status", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      const mockOrder = { id: "order-123", status: "preparing" };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "admin" },
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "preparing" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toEqual(mockOrder);
    });

    it("should accept all valid status values", async () => {
      const validStatuses = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ];

      for (const status of validStatuses) {
        jest.clearAllMocks();

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUsers.staff },
          error: null,
        });

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "staff" },
                  error: null,
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "order-123", status },
                  error: null,
                }),
              }),
            }),
          }),
        });

        const request = createMockRequest(
          "http://localhost:3000/api/orders/order-123",
          {
            method: "PATCH",
            body: { status },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Update Errors", () => {
    it("should return 404 when order not found", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "staff" },
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Order not found");
    });

    it("should return 403 for RLS policy violation", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: "staff" },
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "42501" },
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("permission");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/orders/order-123",
        {
          method: "PATCH",
          body: { status: "confirmed" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
