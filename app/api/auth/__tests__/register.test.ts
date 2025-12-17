/**
 * Tests for POST /api/auth/register
 *
 * PURPOSE:
 * Test customer registration endpoint
 *
 * COVERAGE:
 * - Successful customer registration
 * - Input validation (email, password required)
 * - Supabase auth errors (duplicate email, weak password)
 * - Error handling for missing user data
 * - Ensures role is set by database trigger (not client)
 * - No real database calls (mocked Supabase)
 */

import { POST } from "@/app/api/auth/register/route";
import {
  createMockRequest,
  createMockSupabaseClient,
} from "../../__tests__/test-utils";

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

describe("POST /api/auth/register", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Successful Registration", () => {
    it("should register a new customer with valid credentials", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "newuser@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "SecurePass123!" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Registration successful");
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("newuser@test.com");
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "newuser@test.com",
        password: "SecurePass123!",
      });
    });

    it("should not include role in signUp call (handled by database trigger)", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "newuser@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "password123" },
        }
      );

      await POST(request);

      // Verify signUp is called without role metadata
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "newuser@test.com",
        password: "password123",
      });
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when email is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return 400 when password is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return 400 when both email and password are missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
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

  describe("Supabase Auth Errors", () => {
    it("should return 400 for duplicate email", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "existing@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User already registered");
    });

    it("should return 400 for weak password", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Password should be at least 6 characters" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password should be at least 6 characters");
    });

    it("should return 400 for invalid email format", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid email format" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "invalid-email", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when user creation fails without error message", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create user");
    });

    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.auth.signUp.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle JSON parsing errors", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: null,
        }
      );

      request.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("Response Structure", () => {
    it("should return correct response structure on successful registration", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "newuser@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: { email: "newuser@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        message: "Registration successful",
        user: {
          id: expect.any(String),
          email: expect.any(String),
        },
      });
    });
  });
});
