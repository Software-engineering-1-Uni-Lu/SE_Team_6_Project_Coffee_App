/**
 * Tests for POST /api/auth/register/staff
 *
 * PURPOSE:
 * Test staff/manager/admin registration endpoint with invite codes
 *
 * COVERAGE:
 * - Successful staff registration with valid invite code
 * - Input validation (email, password, inviteCode required)
 * - Invalid/expired/used invite code handling
 * - Supabase auth errors (duplicate email, weak password)
 * - Role assignment by database trigger (not client-controlled)
 * - Error handling for missing user data
 * - No real database calls (mocked Supabase)
 */

import { POST } from "@/app/api/auth/register/staff/route";
import {
  createMockRequest,
  createMockSupabaseClient,
} from "../../../../__tests__/test-utils";

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

describe("POST /api/auth/register/staff", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Successful Registration", () => {
    it("should register a new staff member with valid invite code", async () => {
      const mockUser = {
        id: "new-staff-123",
        email: "newstaff@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "SecurePass123!",
            inviteCode: "VALID-STAFF-CODE",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Registration successful");
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("newstaff@test.com");
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "newstaff@test.com",
        password: "SecurePass123!",
        options: {
          data: {
            invite_code: "VALID-STAFF-CODE",
          },
        },
      });
    });

    it("should pass invite code in user metadata for database trigger", async () => {
      const mockUser = {
        id: "new-manager-123",
        email: "newmanager@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newmanager@test.com",
            password: "password123",
            inviteCode: "MANAGER-INVITE",
          },
        }
      );

      await POST(request);

      // Verify signUp includes invite code in metadata for trigger
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "newmanager@test.com",
        password: "password123",
        options: {
          data: {
            invite_code: "MANAGER-INVITE",
          },
        },
      });
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when email is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: { password: "password123", inviteCode: "VALID-CODE" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password, and invite code are required");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return 400 when password is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: { email: "newstaff@test.com", inviteCode: "VALID-CODE" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password, and invite code are required");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return 400 when invite code is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: { email: "newstaff@test.com", password: "password123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password, and invite code are required");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return 400 when all fields are missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email, password, and invite code are required");
    });
  });

  describe("Invite Code Validation", () => {
    it("should return 400 for invalid invite code (database trigger rejection)", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "Database error: Invalid invite code",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "INVALID-CODE",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid, expired, or already used invite code. Please contact an administrator."
      );
    });

    it("should return 400 for expired invite code", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "The invite code has expired",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "EXPIRED-CODE",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid, expired, or already used invite code. Please contact an administrator."
      );
    });

    it("should return 400 for already used invite code", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "This invite code has already been used",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "USED-CODE",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid, expired, or already used invite code. Please contact an administrator."
      );
    });
  });

  describe("Supabase Auth Errors", () => {
    it("should return 400 for duplicate email", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "existing@test.com",
            password: "password123",
            inviteCode: "VALID-CODE",
          },
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
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "123",
            inviteCode: "VALID-CODE",
          },
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
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "invalid-email",
            password: "password123",
            inviteCode: "VALID-CODE",
          },
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
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "VALID-CODE",
          },
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
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "VALID-CODE",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle JSON parsing errors", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
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
    it("should return correct response structure on successful staff registration", async () => {
      const mockUser = {
        id: "new-staff-123",
        email: "newstaff@test.com",
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/register/staff",
        {
          method: "POST",
          body: {
            email: "newstaff@test.com",
            password: "password123",
            inviteCode: "VALID-CODE",
          },
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
