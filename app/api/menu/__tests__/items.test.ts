/**
 * Tests for GET /api/menu/items and POST /api/menu/items
 *
 * PURPOSE:
 * Test menu items endpoints for fetching and creating menu items
 *
 * COVERAGE:
 * - GET: Public access to fetch menu items
 * - GET: Error handling for database failures
 * - POST: Authentication required
 * - POST: Role-based authorization (manager/admin only)
 * - POST: Input validation (required fields)
 * - POST: Schema validation (price must be non-negative)
 * - POST: Successful item creation
 * - No real database calls (mocked Supabase)
 */

import { GET, POST } from "@/app/api/menu/items/route";
import {
  createMockRequest,
  createMockSupabaseClient,
  mockUsers,
  mockMenuItems,
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

describe("GET /api/menu/items", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Successful Retrieval", () => {
    it("should return all menu items with 200 status", async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockMenuItems,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/menu/items");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual(mockMenuItems);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("items");
      expect(mockFrom.select).toHaveBeenCalledWith(
        "*, category:categories(id, name, slug)"
      );
      expect(mockFrom.order).toHaveBeenCalledWith("name");
    });

    it("should return empty array when no items exist", async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/menu/items");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
    });

    it("should handle null data gracefully", async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/menu/items");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const request = createMockRequest("http://localhost:3000/api/menu/items");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Connection failed");
      });

      const request = createMockRequest("http://localhost:3000/api/menu/items");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});

describe("POST /api/menu/items", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication Required", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Authorization - Role-Based Access Control", () => {
    it("should allow admin to create menu items", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 1, name: "New Item" },
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item).toBeDefined();
    });

    it("should allow manager to create menu items", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 1, name: "New Item" },
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should return 403 when customer tries to create menu items", async () => {
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

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can create menu items");
    });

    it("should return 403 when staff tries to create menu items", async () => {
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

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can create menu items");
    });
  });

  describe("Input Validation", () => {
    beforeEach(() => {
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
    });

    it("should return 400 when category_id is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when name is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when slug is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when price_cents is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when price_cents is negative", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: -100,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Price must be non-negative");
    });

    it("should accept price_cents of 0", async () => {
      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 1, name: "Free Item", price_cents: 0 },
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "Free Item",
            slug: "free-item",
            price_cents: 0,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item.price_cents).toBe(0);
    });
  });

  describe("Successful Creation", () => {
    it("should create menu item with all required fields", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newItem = {
        id: 3,
        category_id: 1,
        name: "New Item",
        slug: "new-item",
        price_cents: 500,
        description: "Test item",
        active: true,
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: newItem,
            error: null,
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
            description: "Test item",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item).toEqual(newItem);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when database insert fails", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = jest.fn((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Duplicate slug" },
          }),
        };
      });
      mockSupabaseClient.from = mockFrom;

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "existing-slug",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Duplicate slug");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Connection failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items",
        {
          method: "POST",
          body: {
            category_id: 1,
            name: "New Item",
            slug: "new-item",
            price_cents: 500,
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
