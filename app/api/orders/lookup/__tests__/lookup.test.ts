/**
 * Tests for POST /api/orders/lookup
 */

import { POST } from "@/app/api/orders/lookup/route";
import { createMockRequest } from "../../../__tests__/test-utils";

const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn((...args) => mockCreateAdminClient(...args)),
}));

describe("POST /api/orders/lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    });
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("Input Validation", () => {
    it("should return 400 when orderId is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: { email: "guest@test.com" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("A valid order ID is required");
    });

    it("should return 400 when orderId is invalid UUID", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: { orderId: "invalid-uuid", email: "guest@test.com" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("A valid order ID is required");
    });

    it("should return 400 when email is missing", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: { orderId: "123e4567-e89b-12d3-a456-426614174000" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required to look up an order");
    });

    it("should return 400 for invalid JSON", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: null,
        }
      );

      request.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request body. Expected JSON.");
    });
  });

  describe("Service Role Key", () => {
    it("should return 500 when service role key is missing", async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "guest@test.com",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });
  });

  describe("Order Lookup", () => {
    it("should return 404 when order not found for email", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "wrong@test.com",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Order not found for that email");
    });

    it("should return only the specific order that was requested", async () => {
      const mockOrder = { id: "order-1", guest_email: "guest@test.com" };

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: verify ownership
          return {
            eq: jest.fn().mockReturnValue({
              ilike: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: "order-1" },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Second call: fetch the specific order
          return {
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null,
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "guest@test.com",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toEqual([mockOrder]);
      expect(data.orders).toHaveLength(1);
    });

    it("should normalize email to lowercase", async () => {
      const mockIlike = jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "order-1" },
          error: null,
        }),
      });

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          ilike: mockIlike,
          single: jest.fn().mockResolvedValue({
            data: { id: "order-1", guest_email: "guest@test.com" },
            error: null,
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "GUEST@TEST.COM",
          },
        }
      );

      await POST(request);

      expect(mockIlike).toHaveBeenCalledWith("guest_email", "guest@test.com");
    });

    it("should trim whitespace from inputs", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: "order-1" },
              error: null,
            }),
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: "order-1", guest_email: "guest@test.com" },
            error: null,
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "  123e4567-e89b-12d3-a456-426614174000  ",
            email: "  guest@test.com  ",
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when verification query fails", async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "guest@test.com",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Unable to verify order");
    });

    it("should return 500 when lookup query fails", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            eq: jest.fn().mockReturnValue({
              ilike: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: "order-1" },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          return {
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          };
        }
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "guest@test.com",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle unexpected errors", async () => {
      mockCreateAdminClient.mockImplementation(() => {
        throw new Error("Network error");
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders/lookup",
        {
          method: "POST",
          body: {
            orderId: "123e4567-e89b-12d3-a456-426614174000",
            email: "guest@test.com",
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
