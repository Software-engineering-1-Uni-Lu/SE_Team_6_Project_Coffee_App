/**
 * Tests for PATCH /api/auth/update
 *
 * PURPOSE:
 * Test profile update endpoint for email, password, and role changes
 *
 * COVERAGE:
 * - Authentication enforcement (401 for unauthenticated)
 * - Email updates for all roles
 * - Password updates for all roles
 * - Role changes (admin only - 403 for non-admins)
 * - Invalid role validation (400 for invalid roles)
 * - Update errors from Supabase
 * - Unexpected error handling
 * - No real database calls (mocked Supabase)
 */

import { PATCH } from "@/app/api/auth/update/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../../__tests__/test-utils";
import * as auth from "@/src/lib/auth";
import * as authUtils from "@/src/lib/auth-utils";

// Mock auth module
jest.mock("@/src/lib/auth");
jest.mock("@/src/lib/auth-utils");

// Mock Supabase server client
jest.mock("@/src/integrations/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("PATCH /api/auth/update", () => {
  let mockSupabaseClient: any;
  const mockGetCurrentUser = auth.getCurrentUser as jest.MockedFunction<
    typeof auth.getCurrentUser
  >;
  const mockGetUserRole = authUtils.getUserRole as jest.MockedFunction<
    typeof authUtils.getUserRole
  >;
  const mockIsValidRole = authUtils.isValidRole as jest.MockedFunction<
    typeof authUtils.isValidRole
  >;
  const { createClient } = require("@/src/integrations/supabase/server");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    // Add updateUser mock to the client
    mockSupabaseClient.auth.updateUser = jest.fn();

    createClient.mockResolvedValue(mockSupabaseClient);

    // Default: valid roles
    mockIsValidRole.mockReturnValue(true);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "new@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("Email Updates", () => {
    it("should update email for customer", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: "newemail@test.com" } },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "newemail@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account updated successfully");
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        email: "newemail@test.com",
      });
    });

    it("should update email for staff", async () => {
      const mockUser = mockUsers.staff;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: "newstaff@test.com" } },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "newstaff@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account updated successfully");
    });
  });

  describe("Password Updates", () => {
    it("should update password", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { password: "newPassword123!" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account updated successfully");
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "newPassword123!",
      });
    });

    it("should update both email and password", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: "new@test.com" } },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "new@test.com", password: "newPassword123!" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "newPassword123!",
      });
    });
  });

  describe("Role Changes", () => {
    it("should allow admin to change user role", async () => {
      const mockUser = mockUsers.admin;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetUserRole.mockReturnValue("admin");
      mockIsValidRole.mockReturnValue(true);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...mockUser, user_metadata: { role: "staff" } } },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { role: "staff" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: { role: "staff" },
      });
    });

    it("should prevent non-admin from changing roles", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetUserRole.mockReturnValue("customer");

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { role: "admin" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can modify roles");
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it("should prevent staff from changing roles", async () => {
      const mockUser = mockUsers.staff;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetUserRole.mockReturnValue("staff");

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { role: "manager" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can modify roles");
    });

    it("should prevent manager from changing roles", async () => {
      const mockUser = mockUsers.manager;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetUserRole.mockReturnValue("manager");

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { role: "admin" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can modify roles");
    });

    it("should return 400 for invalid role", async () => {
      const mockUser = mockUsers.admin;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetUserRole.mockReturnValue("admin");
      mockIsValidRole.mockReturnValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { role: "superuser" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid role specified");
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("Update Errors", () => {
    it("should return 400 when updateUser fails", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Email already in use" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "existing@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email already in use");
    });

    it("should handle weak password errors", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Password should be at least 6 characters" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { password: "123" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password should be at least 6 characters");
    });
  });

  describe("Unexpected Errors", () => {
    it("should handle unexpected errors", async () => {
      const mockUser = mockUsers.customer;
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "new@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle getCurrentUser errors", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Auth service down"));

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "new@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });
  });

  describe("Response Structure", () => {
    it("should return user data in response", async () => {
      const mockUser = mockUsers.customer;
      const updatedUser = { ...mockUser, email: "updated@test.com" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: updatedUser },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/update",
        {
          method: "PATCH",
          body: { email: "updated@test.com" },
        }
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(data).toMatchObject({
        message: "Account updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          user_metadata: updatedUser.user_metadata,
        },
      });
    });
  });
});
