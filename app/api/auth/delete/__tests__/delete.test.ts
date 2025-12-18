/**
 * Tests for DELETE /api/auth/delete
 *
 * PURPOSE:
 * Test permanent account deletion endpoint
 *
 * COVERAGE:
 * - Authentication enforcement (401 for unauthenticated users)
 * - Successful deletion for all user roles
 * - Service role key validation
 * - Admin client usage for deletion
 * - Error handling for deletion failures
 * - Unexpected error handling
 * - No real database calls (mocked Supabase)
 */

import { DELETE } from "@/app/api/auth/delete/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../../__tests__/test-utils";

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

// Mock @supabase/supabase-js for admin client
const mockDeleteUser = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

describe("DELETE /api/auth/delete", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    // Default: successful deletion
    mockDeleteUser.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("should return 401 when auth error occurs", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid session" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });

  describe("Successful Deletion", () => {
    it("should successfully delete customer account", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account deleted successfully");
      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it("should successfully delete staff account", async () => {
      const mockUser = mockUsers.staff;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account deleted successfully");
      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it("should successfully delete admin account", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account deleted successfully");
      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("Configuration Errors", () => {
    it("should return 500 when SUPABASE_SERVICE_ROLE_KEY is not configured", async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Service role key not configured");
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });

  describe("Delete Operation Errors", () => {
    it("should return 500 when deleteUser fails", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockDeleteUser.mockResolvedValue({
        data: null,
        error: { message: "Failed to delete user" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete user");
    });

    it("should handle database connection errors", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockDeleteUser.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database connection failed");
    });
  });

  describe("Unexpected Errors", () => {
    it("should handle unexpected errors during deletion", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockDeleteUser.mockRejectedValue(new Error("Network error"));

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle errors when getting user", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Failed to get user")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/auth/delete",
        { method: "DELETE" }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });
  });
});
