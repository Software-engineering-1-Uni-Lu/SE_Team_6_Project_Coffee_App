/**
 * Tests for GET /api/admin/staff
 */

import { GET } from "@/app/api/admin/staff/route";
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

describe("GET /api/admin/staff", () => {
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
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "staff" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Access denied");
    });
  });

  describe("Successful Listing", () => {
    it("should return staff list for manager", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      const mockRoleRows = [
        { user_id: "staff-1", role: "staff" },
        { user_id: "staff-2", role: "staff" },
      ];

      const mockProfiles = [
        {
          id: "staff-1",
          email: "staff1@test.com",
          full_name: "Staff One",
          phone: null,
          blocked: false,
          created_at: "2024-01-01",
        },
        {
          id: "staff-2",
          email: "staff2@test.com",
          full_name: "Staff Two",
          phone: null,
          blocked: false,
          created_at: "2024-01-02",
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "manager" },
                  error: null,
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: mockRoleRows,
                error: null,
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.staff).toHaveLength(2);
      expect(data.staff[0].role).toBe("staff");
    });

    it("should return all staff for admin", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      const mockRoleRows = [
        { user_id: "staff-1", role: "staff" },
        { user_id: "mgr-1", role: "manager" },
        { user_id: "admin-2", role: "admin" },
      ];

      const mockProfiles = [
        {
          id: "staff-1",
          email: "staff1@test.com",
          full_name: "Staff One",
          phone: null,
          blocked: false,
          created_at: "2024-01-01",
        },
        {
          id: "mgr-1",
          email: "mgr1@test.com",
          full_name: "Manager One",
          phone: null,
          blocked: false,
          created_at: "2024-01-02",
        },
        {
          id: "admin-2",
          email: "admin2@test.com",
          full_name: "Admin Two",
          phone: null,
          blocked: false,
          created_at: "2024-01-03",
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "admin" },
                  error: null,
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: mockRoleRows,
                error: null,
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.staff).toHaveLength(3);
    });

    it("should return empty array when no staff found", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "manager" },
                  error: null,
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.staff).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when role query fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "admin" },
                  error: null,
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to fetch");
    });

    it("should return 500 when profile query fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "admin" },
                  error: null,
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: [{ user_id: "staff-1", role: "staff" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Profile query failed" },
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to fetch");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/admin/staff",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
