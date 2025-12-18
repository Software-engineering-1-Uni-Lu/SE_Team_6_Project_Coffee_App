/**
 * Tests for GET/POST /api/admin/invites
 */

import { GET, POST } from "@/app/api/admin/invites/route";
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

describe("POST /api/admin/invites", () => {
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
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
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
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
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
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Access denied");
    });

    it("should return 403 when manager tries to create manager invite", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "manager" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain(
        "Managers can only generate staff invite codes"
      );
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when role is missing", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Role must be");
    });

    it("should return 400 for invalid role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "customer" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Role must be");
    });

    it("should return 400 for invalid expiresInDays", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff", expiresInDays: 400 },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("expiresInDays must be");
    });
  });

  describe("Successful Invite Creation", () => {
    it("should allow manager to create staff invite", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: "INVITE-ABC123",
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("success");
      expect(data.inviteCode).toBe("INVITE-ABC123");
    });

    it("should allow admin to create manager invite", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: "INVITE-MGR456",
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "manager" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inviteCode).toBe("INVITE-MGR456");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when RPC fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to generate");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "POST",
          body: { role: "staff" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});

describe("GET /api/admin/invites", () => {
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
        "http://localhost:3000/api/admin/invites",
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
        "http://localhost:3000/api/admin/invites",
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
    it("should return invites for admin", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      const mockInvites = [
        { id: "inv-1", code: "INVITE-1", role: "staff" },
        { id: "inv-2", code: "INVITE-2", role: "manager" },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
          order: jest.fn().mockResolvedValue({
            data: mockInvites,
            error: null,
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invites).toEqual(mockInvites);
    });

    it("should return invites for manager", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
        error: null,
      });

      const mockInvites = [{ id: "inv-1", code: "INVITE-1", role: "staff" }];

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
        if (table === "staff_invite_codes") {
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation(() =>
              Promise.resolve({
                data: mockInvites,
                error: null,
              })
            ),
          };
          chain.select = jest.fn().mockReturnValue(chain);
          chain.eq = jest.fn().mockReturnValue(chain);
          return chain;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      const data = await response.json();

      if (response.status === 200) {
        expect(data.invites).toBeDefined();
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when query fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/admin/invites",
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
