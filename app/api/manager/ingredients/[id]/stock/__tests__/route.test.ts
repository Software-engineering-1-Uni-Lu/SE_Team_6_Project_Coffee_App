/**
 * Tests for PATCH /api/manager/ingredients/[id]/stock
 *
 * PURPOSE:
 * Test stock update endpoint for CSA-214: Modify In-Stock Quantity
 *
 * COVERAGE:
 * - Authentication required
 * - Role-based authorization (manager/admin only)
 * - Input validation (new_quantity, reason, note)
 * - Stock update with audit log creation
 * - Error handling
 */

import { PATCH } from "@/app/api/manager/ingredients/[id]/stock/route";
import {
  createMockRequest,
  createMockSupabaseClient,
  mockUsers,
} from "../../../../../__tests__/test-utils";

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

describe("PATCH /api/manager/ingredients/[id]/stock", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  const mockItem = {
    id: "item-123",
    name: "Whole Milk 2%",
    stock_quantity: 1000,
    low_stock_threshold: 500,
  };

  const mockAuditLog = {
    id: "audit-123",
    item_id: "item-123",
    user_id: "manager-123",
    old_quantity: 1000,
    new_quantity: 2500,
    reason: "Restock",
    note: "Weekly delivery",
    created_at: "2026-01-19T20:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient({
      user: mockUsers.manager,
    });
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient = createMockSupabaseClient({ user: null });
      createServerClient.mockReturnValue(mockSupabaseClient);

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 403 when user is not manager or admin", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: mockUsers.customer,
        dbData: { role: "customer" },
      });
      createServerClient.mockReturnValue(mockSupabaseClient);

      // Mock user_roles query
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can modify stock");
    });
  });

  describe("Input Validation", () => {
    beforeEach(() => {
      // Setup role check to pass
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);
    });

    it("should return 400 when new_quantity is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("new_quantity is required");
    });

    it("should return 400 when reason is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500 },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("reason is required");
    });

    it("should return 400 when reason is invalid", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "InvalidReason" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid reason");
    });

    it("should return 400 when quantity is negative", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: -100, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("new_quantity must be a non-negative number");
    });

    it("should return 400 when note exceeds 500 characters", async () => {
      const longNote = "a".repeat(501);
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: {
            new_quantity: 2500,
            reason: "Restock",
            note: longNote,
          },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("note must be 500 characters or less");
    });
  });

  describe("Successful Stock Update", () => {
    let itemsCallCount = 0;
    let capturedUpdateData: any = null;

    beforeEach(() => {
      // Reset counters for each test
      itemsCallCount = 0;
      capturedUpdateData = null;

      // Setup role check
      mockSupabaseClient.from.mockImplementation((table: string): any => {
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn((data: any) => {
            capturedUpdateData = data;
            return mockFrom;
          }),
          insert: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "items") {
          // Configure single() to check call count and captured data when called
          mockFrom.single.mockImplementation(() => {
            if (itemsCallCount === 0) {
              // First call: get current item
              itemsCallCount++;
              return Promise.resolve({
                data: mockItem,
                error: null,
              });
            } else {
              // Second call: update item - return the updated value from the update call
              const updatedQuantity =
                capturedUpdateData?.stock_quantity ?? 2500;
              itemsCallCount = 0; // Reset for next test
              capturedUpdateData = null;
              return Promise.resolve({
                data: { ...mockItem, stock_quantity: updatedQuantity },
                error: null,
              });
            }
          });
        } else if (table === "stock_audit_log") {
          mockFrom.single.mockResolvedValue({
            data: mockAuditLog,
            error: null,
          });
        }

        return mockFrom;
      });
    });

    it("should successfully update stock and create audit log", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: {
            new_quantity: 2500,
            reason: "Restock",
            note: "Weekly delivery",
          },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated_ingredient.stock_quantity).toBe(2500);
      expect(data.audit_log_id).toBe("audit-123");
    });

    it("should accept all valid reason codes", async () => {
      const reasons = ["Restock", "Waste", "Correction", "Manual Adjustment"];

      for (const reason of reasons) {
        const request = createMockRequest(
          "http://localhost:3000/api/manager/ingredients/item-123/stock",
          {
            method: "PATCH",
            body: { new_quantity: 2500, reason },
          }
        );

        const response = await PATCH(request, {
          params: Promise.resolve({ id: "item-123" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("should allow zero quantity", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 0, reason: "Waste" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated_ingredient.stock_quantity).toBe(0);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      // Setup role check to pass
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);
    });

    it("should return 404 when item does not exist", async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "items") {
          mockFrom.single.mockResolvedValue({
            data: null,
            error: { message: "Item not found" },
          });
        }

        return mockFrom;
      });

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/invalid-id/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "invalid-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Item not found");
    });

    it("should handle database update errors", async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "items") {
          if (callCount === 0) {
            // First call: get current item
            mockFrom.single.mockResolvedValue({
              data: mockItem,
              error: null,
            });
            callCount++;
          } else {
            // Second call: update item (fails)
            mockFrom.single.mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            });
          }
        }

        return mockFrom;
      });

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("should handle audit log creation failure gracefully", async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "items") {
          if (callCount === 0) {
            mockFrom.single.mockResolvedValue({
              data: mockItem,
              error: null,
            });
            callCount++;
          } else {
            mockFrom.single.mockResolvedValue({
              data: { ...mockItem, stock_quantity: 2500 },
              error: null,
            });
          }
        } else if (table === "stock_audit_log") {
          mockFrom.single.mockResolvedValue({
            data: null,
            error: { message: "Audit log creation failed" },
          });
        }

        return mockFrom;
      });

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/item-123/stock",
        {
          method: "PATCH",
          body: { new_quantity: 2500, reason: "Restock" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "item-123" }),
      });
      const data = await response.json();

      // Should still return 200 but with warning
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.updated_ingredient.stock_quantity).toBe(2500);
    });
  });
});
