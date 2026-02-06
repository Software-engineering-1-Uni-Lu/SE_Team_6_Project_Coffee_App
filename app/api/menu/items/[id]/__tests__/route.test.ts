/**
 * Tests for PATCH /api/menu/items/[id] and DELETE /api/menu/items/[id]
 *
 * PURPOSE:
 * Test menu item update and delete endpoints
 *
 * COVERAGE:
 * - Authentication enforcement (401 for unauthenticated users)
 * - Role authorization (403 for customer/staff, success for manager/admin)
 * - Successful menu item updates (PATCH)
 * - Successful menu item deletion (DELETE)
 * - Price validation (non-negative)
 * - Database errors (update/delete failures)
 * - Unexpected error handling
 * - No real database calls (mocked Supabase)
 */

import { PATCH, DELETE } from "@/app/api/menu/items/[id]/route";
import {
  createMockRequest,
  mockUsers,
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

const mockParams = { params: { id: "item-123" } };

describe("PATCH /api/menu/items/[id]", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Item" },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Role Authorization", () => {
    it("should return 403 for customer trying to update item", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Item" },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can update menu items");
    });

    it("should return 403 for staff trying to update item", async () => {
      const mockUser = mockUsers.staff;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "staff" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Item" },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can update menu items");
    });
  });

  describe("Successful Updates", () => {
    it("should allow manager to update menu item", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateData = {
        id: "item-123",
        name: "Updated Coffee",
        price_cents: 450,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdateData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Coffee", price_cents: 450 },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item).toEqual(mockUpdateData);
    });

    it("should allow admin to update menu item", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateData = {
        id: "item-123",
        name: "Updated Tea",
        price_cents: 350,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdateData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Tea", price_cents: 350 },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item).toEqual(mockUpdateData);
    });

    it("should allow updating sold_out status", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateData = {
        id: "item-123",
        name: "Americano",
        sold_out: true,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdateData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { sold_out: true },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.sold_out).toBe(true);
    });
  });

  describe("Price Validation", () => {
    it("should return 400 for negative price", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { price_cents: -100 },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Price must be non-negative");
    });
  });

  describe("Update Errors", () => {
    it("should return 500 when database update fails", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Item" },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "PATCH",
          body: { name: "Updated Item" },
        }
      );

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});

describe("DELETE /api/menu/items/[id]", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Role Authorization", () => {
    it("should return 403 for customer trying to delete item", async () => {
      const mockUser = mockUsers.customer;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can delete menu items");
    });

    it("should return 403 for staff trying to delete item", async () => {
      const mockUser = mockUsers.staff;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "staff" },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can delete menu items");
    });
  });

  describe("Successful Deletion", () => {
    it("should allow manager to delete menu item", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Item deleted successfully");
    });

    it("should allow admin to delete menu item", async () => {
      const mockUser = mockUsers.admin;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Item deleted successfully");
    });
  });

  describe("Delete Errors", () => {
    it("should return 500 when database delete fails", async () => {
      const mockUser = mockUsers.manager;
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "manager" },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/items/item-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
