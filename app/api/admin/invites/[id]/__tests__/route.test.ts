/**
 * Tests for DELETE /api/admin/invites/[id]
 */

import { DELETE } from "@/app/api/admin/invites/[id]/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../../../__tests__/test-utils";

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

describe("DELETE /api/admin/invites/[id]", () => {
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
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
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
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
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
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Access denied");
    });

    it("should return 403 when manager tries to delete manager invite", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "invite-1", role: "manager", used: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("can only delete staff invite");
    });
  });

  describe("Validation", () => {
    it("should return 404 when invite not found", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Not found" },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invalid",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invalid" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should return 400 when trying to delete used invite", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "invite-1", role: "staff", used: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot delete used");
    });
  });

  describe("Successful Deletion", () => {
    it("should allow manager to delete staff invite", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "invite-1",
                    role: "staff",
                    used: false,
                    code: "STAFF-123",
                  },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        if (table === "audit_log") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("success");
    });

    it("should allow admin to delete any invite", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "invite-1",
                    role: "manager",
                    used: false,
                    code: "MGR-456",
                  },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        if (table === "audit_log") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("success");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when deletion fails", async () => {
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
            }),
          };
        }
        if (table === "staff_invite_codes") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "invite-1", role: "staff", used: false },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites/invite-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "invite-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
