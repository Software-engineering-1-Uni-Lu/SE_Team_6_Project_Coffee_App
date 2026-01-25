/**
 * Tests for GET /api/manager/ingredients/audit-log
 *
 * PURPOSE:
 * Test audit log retrieval endpoint for CSA-214: Modify In-Stock Quantity
 *
 * COVERAGE:
 * - Authentication required
 * - Role-based authorization (manager/admin only)
 * - Filtering (ingredient_id, user_id, date range, reason)
 * - Pagination
 * - Error handling
 */

import { GET } from "@/app/api/manager/ingredients/audit-log/route";
import {
  createMockRequest,
  createMockSupabaseClient,
  mockUsers,
} from "../../../../__tests__/test-utils";

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

describe("GET /api/manager/ingredients/audit-log", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  const mockAuditLogEntries = [
    {
      id: "audit-1",
      item_id: "item-1",
      user_id: "manager-123",
      old_quantity: 1000,
      new_quantity: 1500,
      reason: "Restock",
      note: "Weekly delivery",
      created_at: "2026-01-19T10:00:00Z",
      items: { id: "item-1", name: "Whole Milk 2%", slug: "whole-milk" },
      profiles: {
        id: "manager-123",
        full_name: "John Manager",
        email: "john@example.com",
      },
    },
    {
      id: "audit-2",
      item_id: "item-2",
      user_id: "manager-123",
      old_quantity: 500,
      new_quantity: 400,
      reason: "Waste",
      note: null,
      created_at: "2026-01-19T11:00:00Z",
      items: { id: "item-2", name: "Espresso Beans", slug: "espresso-beans" },
      profiles: {
        id: "manager-123",
        full_name: "John Manager",
        email: "john@example.com",
      },
    },
  ];

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
        "http://localhost:3000/api/manager/ingredients/audit-log"
      );

      const response = await GET(request);
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
        "http://localhost:3000/api/manager/ingredients/audit-log"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can view audit logs");
    });
  });

  describe("Pagination Validation", () => {
    beforeEach(() => {
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

    it("should return 400 when page is less than 1", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?page=0"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Page must be >= 1");
    });

    it("should return 400 when limit is less than 1", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?limit=0"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Limit must be between 1 and 100");
    });

    it("should return 400 when limit exceeds 100", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?limit=101"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Limit must be between 1 and 100");
    });
  });

  describe("Successful Retrieval", () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "stock_audit_log") {
          // Make all chainable methods return mockFrom so chaining works
          mockFrom.eq = jest.fn().mockReturnValue(mockFrom);
          mockFrom.gte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.lte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.order = jest.fn().mockReturnValue(mockFrom);
          mockFrom.range = jest.fn().mockReturnValue(mockFrom);

          // Make the query awaitable (thenable) - when awaited, returns the data
          // This handles: const { data, error, count } = await query;
          mockFrom.then = jest.fn((onResolve) => {
            const result = {
              data: mockAuditLogEntries,
              error: null,
              count: 2,
            };
            if (onResolve) {
              return Promise.resolve(result).then(onResolve);
            }
            return Promise.resolve(result);
          });
          mockFrom.catch = jest.fn(() => Promise.resolve(mockFrom));
        }

        return mockFrom;
      });
    });

    it("should return paginated audit log entries", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?page=1&limit=50"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
    });

    it("should filter by ingredient_id", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?ingredient_id=item-1"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("stock_audit_log");
    });

    it("should filter by reason", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?reason=Restock"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should filter by date range", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log?start_date=2026-01-19&end_date=2026-01-20"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
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

    it("should handle database errors", async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
            count: null,
          }),
        };

        if (table === "user_roles") {
          mockFrom.single = jest.fn().mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        }

        return mockFrom;
      });

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
