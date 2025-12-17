import { PATCH } from "@/app/api/auth/update/route";
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

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));

describe("PATCH /api/auth/update", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    mockSupabaseClient.auth.updateUser = jest.fn();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { email: "new@test.com" } }
      );
      const response = await PATCH(request);
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Email Updates", () => {
    it("should update email for customer", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: "new@test.com" } },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { email: "new@test.com" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Password Updates", () => {
    it("should update password", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { password: "newPassword123!" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Role Changes", () => {
    it("should allow admin to change user role", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { role: "staff" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it("should prevent non-admin from changing roles", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { role: "admin" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });

    it("should return 400 for invalid role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
        error: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { role: "superuser" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Update Errors", () => {
    it("should return 400 when updateUser fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Email already in use" },
      });
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { email: "existing@test.com" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Unexpected Errors", () => {
    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockRejectedValue(
        new Error("Network error")
      );
      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        { method: "PATCH", body: { email: "new@test.com" } }
      );
      const response = await PATCH(request);
      expect(response.status).toBe(500);
    });
  });
});
