/**
 * Tests for POST /api/auth/login
 *
 * PURPOSE:
 * Test authentication endpoint for email/password login
 *
 * COVERAGE:
 * - Successful login with valid credentials
 * - Failed login with invalid credentials
 * - Validation of required fields (email, password)
 * - Blocked user detection and rejection (403)
 * - Error handling for missing session data
 * - No real database calls (mocked Supabase)
 */

import { POST } from "@/app/api/auth/login/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
} from "../../__tests__/test-utils";
import * as authUtils from "@/src/lib/auth-utils";

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

// Mock auth-utils
jest.mock("@/src/lib/auth-utils", () => ({
  isBlocked: jest.fn(),
}));

describe("POST /api/auth/login", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
    (authUtils.isBlocked as jest.Mock).mockReturnValue(false);
  });

  describe("Successful Login", () => {
    it("should return 200 and user data for valid credentials", async () => {
      const mockUser = mockUsers.customer;
      const mockSession = {
        access_token: "token123",
        refresh_token: "refresh123",
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "customer@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Login successful");
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("customer@test.com");
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "customer@test.com",
        password: "password123",
      });
    });

    it("should check for blocked status before allowing login", async () => {
      const mockUser = mockUsers.customer;
      const mockSession = {
        access_token: "token123",
        refresh_token: "refresh123",
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "customer@test.com", password: "password123" },
        }
      );

      await POST(request);

      expect(authUtils.isBlocked).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("Failed Login - Invalid Credentials", () => {
    it("should return 401 for invalid credentials", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "wrong@test.com", password: "wrongpassword" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should return 500 if user data is missing despite no error", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "customer@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Login failed");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when email is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should return 400 when password is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "customer@test.com" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should return 400 when both email and password are missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });
  });

  describe("Blocked User Handling", () => {
    it("should return 403 and sign out blocked user", async () => {
      const mockUser = mockUsers.blocked;
      const mockSession = {
        access_token: "token123",
        refresh_token: "refresh123",
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      (authUtils.isBlocked as jest.Mock).mockReturnValue(true);

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "blocked@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Account is blocked");
      expect(data.code).toBe("BLOCKED_USER");
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: { email: "customer@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle JSON parsing errors", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          body: null,
        }
      );

      // Mock json() to throw error
      request.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.error).toBeDefined();
    });
  });
});
