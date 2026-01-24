/**
 * Tests for GET /api/loyalty/summary
 */

import { GET } from "@/app/api/loyalty/summary/route";
import {
  createMockSupabaseClient,
  mockUsers,
} from "../../../__tests__/test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

describe("GET /api/loyalty/summary", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns 403 when user is not a customer", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.staff },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: { role: "staff" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only customers can view loyalty points");
  });

  it("returns balance and earned history for customer", async () => {
    const ledgerRows = [
      {
        id: "entry-1",
        order_id: "order-1",
        points_delta: 50,
        reason: "Order completed - points earned",
        created_at: "2024-01-02T10:00:00.000Z",
      },
      {
        id: "entry-2",
        order_id: "order-1",
        points_delta: -50,
        reason: "Payment reversed",
        created_at: "2024-01-03T10:00:00.000Z",
      },
      {
        id: "entry-3",
        order_id: "order-2",
        points_delta: 30,
        reason: "Order completed - points earned",
        created_at: "2024-01-04T10:00:00.000Z",
      },
    ];

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.customer },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: { role: "customer" }, error: null }),
            }),
          }),
        };
      }

      if (table === "loyalty_ledger") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: ledgerRows,
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toBe(30);
    expect(data.history).toHaveLength(2);
    expect(data.history[0].points_delta).toBeGreaterThan(0);
  });

  it("returns 500 when loyalty ledger query fails", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUsers.customer },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: { role: "customer" }, error: null }),
            }),
          }),
        };
      }

      if (table === "loyalty_ledger") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to load loyalty history");
  });
});
