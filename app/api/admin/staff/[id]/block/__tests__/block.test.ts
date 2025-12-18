/**
 * Tests for PATCH /api/admin/staff/[id]/block
 */

import { PATCH } from "@/app/api/admin/staff/[id]/block/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../../../../__tests__/test-utils";

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

describe("PATCH /api/admin/staff/[id]/block", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });
  });

  describe("Role Authorization", () => {
    it("should return 403 for customer", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Access denied");
    });

    it("should return 403 for staff", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "staff" },
          error: null,
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Access denied");
    });

    it("should return 403 when trying to block self", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      });

      const request = createMockRequest(
        `http://localhost:3000/api/admin/staff/${mockUsers.admin.id}/block`,
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: mockUsers.admin.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("cannot block/unblock your own");
    });
  });

  describe("Validation", () => {
    it("should return 400 when blocked is missing", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: {},
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("blocked must be a boolean");
    });

    it("should return 400 when blocked is not boolean", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: "yes" },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("blocked must be a boolean");
    });

    it("should return 403 when permission check fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: false,
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("don't have permission");
    });
  });

  describe("Successful Blocking", () => {
    it("should allow manager to block staff", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          };
        }
        if (table === "profiles") {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        if (table === "audit_log") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("blocked successfully");
      expect(data.blocked).toBe(true);
    });

    it("should allow admin to unblock staff", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        if (table === "profiles") {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        if (table === "audit_log") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: false },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("unblocked successfully");
      expect(data.blocked).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when update fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        if (table === "profiles") {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to update");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff/staff-1/block",
        {
          method: "PATCH",
          body: { blocked: true },
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "staff-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
