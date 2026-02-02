/**
 * Tests for Missing Ingredients Notification API
 * GET /api/ingredients/missing - Fetch notifications
 * POST /api/ingredients/missing - Report missing ingredient
 */

import { GET, POST } from "../route";
import { createMockRequest } from "../../../__tests__/test-utils";

// Mock dependencies
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

const { cookies } = require("next/headers");
const { createServerClient } = require("@supabase/ssr");

describe("/api/ingredients/missing", () => {
  let mockCookieStore: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookie store
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe("GET /api/ingredients/missing", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not staff or above", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "customer@test.com" } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
        "http://localhost:3000/api/ingredients/missing"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(mockSupabase.from).toHaveBeenCalledWith("user_roles");
    });

    it("should return pending notifications by default for staff", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          bean_id: "bean-1",
          reported_by: "user-1",
          status: "pending",
          note: "Running low",
          created_at: "2026-02-01T10:00:00Z",
          beans: {
            id: "bean-1",
            name: "Coffee Beans",
            stock_quantity: 5,
            low_stock_threshold: 10,
            unit: "g",
          },
          reporter: {
            id: "user-1",
            full_name: "Staff User",
            email: "staff@test.com",
          },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "staff@test.com" } },
        error: null,
      });

      const mockQuery = {
        eq: jest.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
        data: mockNotifications,
        error: null,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "staff" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "missing_ingredient_notifications") {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(mockQuery),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toEqual(mockNotifications);
    });

    it("should return all notifications when status=all", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          status: "pending",
        },
        {
          id: "notif-2",
          status: "resolved",
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "manager" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "missing_ingredient_notifications") {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockNotifications,
                error: null,
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing?status=all"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toEqual(mockNotifications);
    });
  });

  describe("POST /api/ingredients/missing", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing",
        {
          method: "POST",
          body: { bean_id: "bean-1" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if bean_id is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
        "http://localhost:3000/api/ingredients/missing",
        {
          method: "POST",
          body: { note: "Test note" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Bean ID is required");
    });

    it("should return 404 if ingredient does not exist", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "staff" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "beans") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error("Not found"),
                }),
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing",
        {
          method: "POST",
          body: { bean_id: "invalid-id" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Ingredient not found");
    });

    it("should return 409 if pending notification already exists", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "staff" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "beans") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "bean-1", name: "Coffee Beans" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "missing_ingredient_notifications") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "existing-notif" },
                error: null,
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing",
        {
          method: "POST",
          body: { bean_id: "bean-1" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe(
        "A pending notification already exists for this ingredient"
      );
    });

    it("should create notification successfully", async () => {
      const mockNotification = {
        id: "notif-1",
        bean_id: "bean-1",
        reported_by: "user-1",
        status: "pending",
        note: "Running low",
        beans: {
          id: "bean-1",
          name: "Coffee Beans",
          stock_quantity: 5,
          low_stock_threshold: 10,
          unit: "g",
        },
        reporter: {
          id: "user-1",
          full_name: "Staff User",
          email: "staff@test.com",
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: "staff" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "beans") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "bean-1", name: "Coffee Beans" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "missing_ingredient_notifications") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockNotification,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/ingredients/missing",
        {
          method: "POST",
          body: { bean_id: "bean-1", note: "Running low" },
        }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notification).toEqual(mockNotification);
    });
  });
});
