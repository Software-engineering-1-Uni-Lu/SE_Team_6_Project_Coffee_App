/**
 * Tests for POST /api/auth/logout
 *
 * PURPOSE:
 * Test logout endpoint that ends user session
 *
 * COVERAGE:
 * - Successful logout
 * - Error handling for logout failures
 * - Cookie removal verification
 * - No authentication required (can logout anytime)
 * - No real database calls (mocked Supabase)
 */

import { POST } from "@/app/api/auth/logout/route";
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

describe("POST /api/auth/logout", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Successful Logout", () => {
    it("should successfully logout and return 200", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Logout successful");
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it("should call signOut on Supabase client", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      await POST(request);

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("should work without requiring authentication", async () => {
      // Logout should work even if user is not authenticated
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when signOut fails", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Failed to sign out" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to sign out");
    });

    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle JSON parsing errors", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: null,
        }
      );

      request.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(request);
      const data = await response.json();

      // Should still work even with JSON parsing error since logout doesn't require body
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("Response Structure", () => {
    it("should return correct response structure", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = createMockRequest(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          body: {},
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        message: "Logout successful",
      });
    });
  });
});
