/**
 * Tests for GET/PATCH/DELETE /api/admin/staff/[id]
 */

import { GET, PATCH, DELETE } from "@/app/api/admin/staff/[id]/route";
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

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        deleteUser: jest.fn(),
      },
    },
  })),
}));

describe("GET /api/admin/staff/[id]", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  it("should return 401 when not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "GET",
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "GET",
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Access denied");
  });

  it("should return staff details for authorized user", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.admin },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { role: userRolesCallCount === 1 ? "admin" : "staff" },
            error: null,
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: "staff-1",
              email: "staff@test.com",
              full_name: "Staff One",
              phone: null,
              blocked: false,
              created_at: "2024-01-01",
            },
            error: null,
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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "GET",
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.staff).toBeDefined();
    expect(data.staff.email).toBe("staff@test.com");
  });
});

describe("PATCH /api/admin/staff/[id]", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  it("should return 401 when not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "PATCH",
        body: { full_name: "Updated Name" },
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 when trying to modify self", async () => {
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
      `http://localhost:3000/api/admin/staff/${mockUsers.admin.id}`,
      {
        method: "PATCH",
        body: { full_name: "Updated Name" },
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockUsers.admin.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("cannot modify your own");
  });

  it("should return 403 when manager tries to change role", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.manager },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { role: userRolesCallCount === 1 ? "manager" : "staff" },
            error: null,
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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "PATCH",
        body: { role: "manager" },
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only admins can change");
  });

  it("should return 400 for email already in use", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.admin },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { role: userRolesCallCount === 1 ? "admin" : "staff" },
            error: null,
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: "other-user" },
            error: null,
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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "PATCH",
        body: { email: "taken@test.com" },
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Email already in use");
  });

  it("should successfully update staff profile", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.admin },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { role: userRolesCallCount === 1 ? "admin" : "staff" },
            error: null,
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: "staff-1",
              email: "updated@test.com",
              full_name: "Updated",
              phone: null,
              blocked: false,
              created_at: "2024-01-01",
            },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          update: jest.fn().mockReturnThis(),
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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "PATCH",
        body: { full_name: "Updated" },
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("success");
  });
});

describe("DELETE /api/admin/staff/[id]", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");
  const { createClient } = require("@supabase/supabase-js");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  it("should return 401 when not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 for non-admin", async () => {
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
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Admins only");
  });

  it("should return 403 when trying to delete self", async () => {
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
      `http://localhost:3000/api/admin/staff/${mockUsers.admin.id}`,
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockUsers.admin.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("cannot delete your own");
  });

  it("should return 403 when trying to delete admin", async () => {
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
      return {};
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/other-admin",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "other-admin" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Cannot delete admin");
  });

  it("should successfully delete staff member", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.admin },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: userRolesCallCount === 1 ? "admin" : "staff" },
                error: null,
              }),
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

    createClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("success");
  });

  it("should handle deletion errors", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.admin },
      error: null,
    });

    let userRolesCallCount = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        userRolesCallCount++;
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: userRolesCallCount === 1 ? "admin" : "staff" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    createClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: jest
            .fn()
            .mockResolvedValue({ error: { message: "Delete failed" } }),
        },
      },
    });

    const request = createMockRequest(
      "http://localhost:3000/api/admin/staff/staff-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "staff-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to delete");
  });
});
