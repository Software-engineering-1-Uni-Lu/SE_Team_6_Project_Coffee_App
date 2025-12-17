/**
 * Unit Tests for Authentication Utilities
 * Tests getUserRole, isBlocked, and isValidRole functions
 */

import {
  getUserRole,
  isBlocked,
  isValidRole,
  type UserRole,
} from "../auth-utils";
import type { User } from "@supabase/supabase-js";

describe("auth-utils", () => {
  describe("getUserRole", () => {
    it('returns "customer" for null user', () => {
      expect(getUserRole(null)).toBe("customer");
    });

    it('returns "customer" for user without role metadata', () => {
      const user = {
        id: "123",
        user_metadata: {},
      } as unknown as User;

      expect(getUserRole(user)).toBe("customer");
    });

    it('returns "customer" for user with undefined role', () => {
      const user = {
        id: "123",
        user_metadata: { role: undefined },
      } as unknown as User;

      expect(getUserRole(user)).toBe("customer");
    });

    it('returns "customer" for user with invalid role', () => {
      const user = {
        id: "123",
        user_metadata: { role: "invalid_role" },
      } as unknown as User;

      expect(getUserRole(user)).toBe("customer");
    });

    it('returns "staff" for staff user', () => {
      const user = {
        id: "123",
        user_metadata: { role: "staff" },
      } as unknown as User;

      expect(getUserRole(user)).toBe("staff");
    });

    it('returns "manager" for manager user', () => {
      const user = {
        id: "123",
        user_metadata: { role: "manager" },
      } as unknown as User;

      expect(getUserRole(user)).toBe("manager");
    });

    it('returns "admin" for admin user', () => {
      const user = {
        id: "123",
        user_metadata: { role: "admin" },
      } as unknown as User;

      expect(getUserRole(user)).toBe("admin");
    });

    it('returns "customer" for user with null metadata', () => {
      const user = {
        id: "123",
        user_metadata: null,
      } as any;

      expect(getUserRole(user)).toBe("customer");
    });

    it("handles user with numeric role", () => {
      const user = {
        id: "123",
        user_metadata: { role: 123 },
      } as any;

      expect(getUserRole(user)).toBe("customer");
    });
  });

  describe("isBlocked", () => {
    it("returns false for null user", () => {
      expect(isBlocked(null)).toBe(false);
    });

    it("returns false for user without blocked metadata", () => {
      const user = {
        id: "123",
        user_metadata: {},
      } as unknown as User;

      expect(isBlocked(user)).toBe(false);
    });

    it("returns false for user with blocked = false", () => {
      const user = {
        id: "123",
        user_metadata: { blocked: false },
      } as unknown as User;

      expect(isBlocked(user)).toBe(false);
    });

    it("returns true for user with blocked = true", () => {
      const user = {
        id: "123",
        user_metadata: { blocked: true },
      } as unknown as User;

      expect(isBlocked(user)).toBe(true);
    });

    it("returns false for user with undefined blocked status", () => {
      const user = {
        id: "123",
        user_metadata: { blocked: undefined },
      } as unknown as User;

      expect(isBlocked(user)).toBe(false);
    });

    it("returns false for user with null metadata", () => {
      const user = {
        id: "123",
        user_metadata: null,
      } as any;

      expect(isBlocked(user)).toBe(false);
    });

    it("returns false for truthy non-boolean values", () => {
      const user = {
        id: "123",
        user_metadata: { blocked: "yes" },
      } as any;

      expect(isBlocked(user)).toBe(false);
    });
  });

  describe("isValidRole", () => {
    it('returns true for "customer"', () => {
      expect(isValidRole("customer")).toBe(true);
    });

    it('returns true for "staff"', () => {
      expect(isValidRole("staff")).toBe(true);
    });

    it('returns true for "manager"', () => {
      expect(isValidRole("manager")).toBe(true);
    });

    it('returns true for "admin"', () => {
      expect(isValidRole("admin")).toBe(true);
    });

    it("returns false for invalid role string", () => {
      expect(isValidRole("superuser")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidRole("")).toBe(false);
    });

    it("returns false for uppercase role", () => {
      expect(isValidRole("ADMIN")).toBe(false);
    });

    it("returns false for role with spaces", () => {
      expect(isValidRole("admin ")).toBe(false);
    });

    it("returns false for numeric string", () => {
      expect(isValidRole("123")).toBe(false);
    });

    it("returns false for special characters", () => {
      expect(isValidRole("admin!")).toBe(false);
    });

    it("type guard works correctly", () => {
      const role: string = "admin";
      if (isValidRole(role)) {
        // TypeScript should recognize role as UserRole here
        const validRole: UserRole = role;
        expect(validRole).toBe("admin");
      }
    });
  });

  describe("Edge Cases and Integration", () => {
    it("handles user with both role and blocked status", () => {
      const user = {
        id: "123",
        user_metadata: { role: "staff", blocked: true },
      } as unknown as User;

      expect(getUserRole(user)).toBe("staff");
      expect(isBlocked(user)).toBe(true);
    });

    it("handles user with extra metadata fields", () => {
      const user = {
        id: "123",
        user_metadata: {
          role: "manager",
          blocked: false,
          name: "John Doe",
          preferences: { theme: "dark" },
        },
      } as unknown as User;

      expect(getUserRole(user)).toBe("manager");
      expect(isBlocked(user)).toBe(false);
    });

    it("validates all role types", () => {
      const roles: UserRole[] = ["customer", "staff", "manager", "admin"];

      roles.forEach((role) => {
        expect(isValidRole(role)).toBe(true);
      });
    });
  });
});
