/**
 * Unit Tests for useUser Hook
 * Tests user authentication state with mocked Supabase client
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "../useUser";
import { createClient } from "@/src/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Mock Supabase client
jest.mock("@/src/integrations/supabase/client");

// Mock fetch
global.fetch = jest.fn();

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
};

describe("useUser Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (global.fetch as jest.Mock).mockClear();

    // Default: return subscription cleanup function
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe("Unauthenticated User", () => {
    it("returns null user and customer role when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.role).toBe("customer");
      expect(result.current.isBlocked).toBe(false);
    });

    it("does not fetch role from API when no user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      renderHook(() => useUser());

      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Authenticated User", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      user_metadata: { role: "customer", blocked: false },
    } as unknown as User;

    it("returns user and fetches role from API", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "customer" } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.role).toBe("customer");
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/user");
    });

    it("handles staff role from API", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "staff" } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe("staff");
    });

    it("handles manager role from API", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "manager" } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe("manager");
    });

    it("handles admin role from API", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "admin" } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe("admin");
    });

    it("defaults to customer role when API fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.role).toBe("customer");

      consoleErrorSpy.mockRestore();
    });

    it("defaults to customer role when API throws error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe("customer");

      consoleErrorSpy.mockRestore();
    });

    it("defaults to customer role when API returns invalid data", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: null }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe("customer");
    });
  });

  describe("Blocked User", () => {
    it("detects blocked user from API response", async () => {
      const blockedUser = {
        id: "user-123",
        email: "blocked@example.com",
        user_metadata: { role: "customer", blocked: true },
      } as unknown as User;

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: blockedUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "customer", isBlocked: true } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isBlocked).toBe(true);
    });

    it("returns false for non-blocked user", async () => {
      const normalUser = {
        id: "user-123",
        email: "normal@example.com",
        user_metadata: { role: "customer", blocked: false },
      } as unknown as User;

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: normalUser },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "customer", isBlocked: false } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isBlocked).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("handles getUser error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error("Auth error"));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.role).toBe("customer");

      consoleErrorSpy.mockRestore();
    });

    it("handles getUser returning error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Session expired" },
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.role).toBe("customer");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Loading State", () => {
    it("starts with loading = true", () => {
      mockSupabase.auth.getUser.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useUser());

      expect(result.current.loading).toBe(true);
    });

    it("sets loading = false after fetch completes", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("Refetch Functionality", () => {
    it("provides refetch function", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("Auth State Changes", () => {
    it("subscribes to auth state changes on mount", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      renderHook(() => useUser());

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });

    it("unsubscribes on unmount", async () => {
      const unsubscribe = jest.fn();
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = renderHook(() => useUser());

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe("Role Mismatch Scenarios", () => {
    it("handles role from API different from metadata", async () => {
      const userWithMetadataRole = {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { role: "customer" },
      } as unknown as User;

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: userWithMetadataRole },
        error: null,
      });

      // API returns different role (database is source of truth)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "staff" } }),
      });

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should use role from API, not metadata
      expect(result.current.role).toBe("staff");
    });
  });
});
