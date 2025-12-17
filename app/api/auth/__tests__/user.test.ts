/**
 * Tests for GET /api/auth/user
 *
 * PURPOSE:
 * Test endpoint that returns current user's details including role from database
 *
 * COVERAGE:
 * - Successful user data retrieval for authenticated user
 * - 401 error for unauthenticated requests
 * - Role fetching from database (user_roles table)
 * - Blocked status fetching from database (profiles table)
 * - Default to customer role on database error
 * - Error handling for various failure scenarios
 * - No real database calls (mocked Supabase)
 */

import { GET } from "@/app/api/auth/user/route";
import {
  createMockSupabaseClient,
  mockUsers,
} from "../../__tests__/test-utils";
import * as auth from "@/src/lib/auth";

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

// Mock auth lib
jest.mock("@/src/lib/auth", () => ({
  isBlockedFromDB: jest.fn(),
}));

describe("GET /api/auth/user", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
    (auth.isBlockedFromDB as jest.Mock).mockResolvedValue(false);
  });

  describe("Authentication Required", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 401 when auth error occurs", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 401 when user object is missing", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Successful User Data Retrieval", () => {
    it("should return user data with customer role", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the from().select().eq().single() chain
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(mockUser.id);
      expect(data.user.email).toBe(mockUser.email);
      expect(data.user.role).toBe("customer");
      expect(data.user.isBlocked).toBe(false);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_roles");
    });

    it("should return user data with staff role from database", async () => {
      const mockUser = mockUsers.staff;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "staff" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("staff");
    });

    it("should return user data with manager role from database", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("manager");
    });

    it("should return user data with admin role from database", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("admin");
    });

    it("should include blocked status from database", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      (auth.isBlockedFromDB as jest.Mock).mockResolvedValue(true);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.isBlocked).toBe(true);
      expect(auth.isBlockedFromDB).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("Role Fetching with Fallback", () => {
    it("should default to customer role when role query fails", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "No role found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("customer");
    });

    it("should default to customer role when role data is missing", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("customer");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 for unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle blocked status check errors gracefully", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      (auth.isBlockedFromDB as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Should still return 500 due to unhandled promise rejection
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });

  describe("User Data Structure", () => {
    it("should include all required user fields", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const response = await GET();
      const data = await response.json();

      expect(data.user).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        isBlocked: expect.any(Boolean),
        created_at: expect.any(String),
      });
      expect(data.user.user_metadata).toBeDefined();
    });
  });
});
