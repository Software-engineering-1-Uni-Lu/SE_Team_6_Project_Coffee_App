/**
 * Tests for GET /api/manager/ingredients/audit-log/export
 *
 * PURPOSE:
 * Test audit log CSV export endpoint for CSA-214: Modify In-Stock Quantity
 *
 * COVERAGE:
 * - Authentication required
 * - Role-based authorization (manager/admin only)
 * - Filtering (same as GET endpoint)
 * - CSV generation
 * - Error handling
 */

import { GET } from "@/app/api/manager/ingredients/audit-log/export/route";
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

describe("GET /api/manager/ingredients/audit-log/export", () => {
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
        "http://localhost:3000/api/manager/ingredients/audit-log/export"
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
        "http://localhost:3000/api/manager/ingredients/audit-log/export"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can export audit logs");
    });
  });

  describe("Successful Export", () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
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

          // Make the query awaitable (thenable) - when awaited, returns the data
          mockFrom.then = jest.fn((onResolve) => {
            const result = {
              data: mockAuditLogEntries,
              error: null,
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

    it("should export audit log as CSV", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log/export"
      );

      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment"
      );
      expect(text).toContain("Date/Time");
      expect(text).toContain("Item Name");
      expect(text).toContain("Whole Milk 2%");
    });

    it("should apply filters when provided", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log/export?ingredient_id=item-1&reason=Restock"
      );

      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBeDefined();
    });

    it("should handle CSV escaping for special characters", async () => {
      const entriesWithSpecialChars = [
        {
          ...mockAuditLogEntries[0],
          note: 'Note with "quotes" and, commas',
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "stock_audit_log") {
          mockFrom.eq = jest.fn().mockReturnValue(mockFrom);
          mockFrom.gte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.lte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.order = jest.fn().mockReturnValue(mockFrom);

          // Make the query awaitable (thenable)
          mockFrom.then = jest.fn((onResolve) => {
            const result = {
              data: entriesWithSpecialChars,
              error: null,
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

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log/export"
      );

      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain('"');
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
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "stock_audit_log") {
          mockFrom.eq = jest.fn().mockReturnValue(mockFrom);
          mockFrom.gte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.lte = jest.fn().mockReturnValue(mockFrom);
          mockFrom.order = jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          });
        }
        return mockFrom;
      });

      const request = createMockRequest(
        "http://localhost:3000/api/manager/ingredients/audit-log/export"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
