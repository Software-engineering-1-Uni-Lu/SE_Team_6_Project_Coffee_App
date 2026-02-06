/**
 * Tests for POST /api/manager/ingredients/bulk-import
 *
 * PURPOSE:
 * Test bulk CSV import endpoint for CSA-214: Modify In-Stock Quantity
 *
 * COVERAGE:
 * - Authentication required
 * - Role-based authorization (manager/admin only)
 * - File validation (type, size)
 * - CSV parsing and validation
 * - All-or-nothing vs partial processing modes
 * - Error handling
 */

import { POST } from "@/app/api/manager/ingredients/bulk-import/route";
import {
  createMockRequest,
  createMockSupabaseClient,
  mockUsers,
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

describe("POST /api/manager/ingredients/bulk-import", () => {
  let mockSupabaseClient: any;
  const { createServerClient } = require("@supabase/ssr");

  const mockBean1 = {
    id: "bean-1",
    name: "Whole Milk 2%",
    stock_quantity: 1000,
  };

  const mockBean2 = {
    id: "bean-2",
    name: "Espresso Beans",
    stock_quantity: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient({
      user: mockUsers.manager,
    });
    createServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient = createMockSupabaseClient({ user: null });
      createServerClient.mockReturnValue(mockSupabaseClient);

      // Mock FormData
      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: 100,
              text: jest
                .fn()
                .mockResolvedValue(
                  "ingredient_id,new_quantity,reason\nbean-1,100,Restock"
                ),
            };
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 403 when user is not manager or admin", async () => {
      mockSupabaseClient = createMockSupabaseClient({
        user: mockUsers.customer,
        dbData: { role: "customer" },
      });
      createServerClient.mockReturnValue(mockSupabaseClient);

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "customer" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: 100,
              text: jest
                .fn()
                .mockResolvedValue(
                  "ingredient_id,new_quantity,reason\nbean-1,100,Restock"
                ),
            };
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "Only managers and admins can import stock updates"
      );
    });
  });

  describe("File Validation", () => {
    beforeEach(() => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);
    });

    it("should return 400 when no file is provided", async () => {
      const mockFormData = {
        get: jest.fn(() => null),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("CSV file is required");
    });

    it("should return 400 when file is not CSV", async () => {
      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.txt",
              type: "text/plain",
              size: 100,
              text: jest.fn().mockResolvedValue("test content"),
            };
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("File must be a CSV");
    });

    it("should return 400 when file exceeds max size", async () => {
      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "large.csv",
              type: "text/csv",
              size: 6 * 1024 * 1024 + 1, // 6MB + 1 byte
              text: jest.fn().mockResolvedValue("x".repeat(6 * 1024 * 1024)),
            };
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("File size exceeds");
    });
  });

  describe("CSV Validation", () => {
    beforeEach(() => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);
    });

    it("should return 400 when CSV is empty", async () => {
      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "empty.csv",
              type: "text/csv",
              size: 0,
              text: jest.fn().mockResolvedValue(""),
            };
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("CSV file is empty or invalid");
    });

    it("should validate missing required fields", async () => {
      const beansMap: Record<string, any> = {
        "bean-1": mockBean1,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "beans") {
          let capturedBeanId: string | null = null;
          let selectedColumns: string[] = [];

          mockFrom.select.mockImplementation((columns: string | string[]) => {
            selectedColumns = Array.isArray(columns) ? columns : [columns];
            return mockFrom;
          });

          mockFrom.eq.mockImplementation((column: string, value: string) => {
            if (column === "id") {
              capturedBeanId = value;
            }
            return mockFrom;
          });

          mockFrom.single.mockImplementation(() => {
            const bean = beansMap[capturedBeanId || ""];
            if (!bean) {
              return Promise.resolve({
                data: null,
                error: { message: "Ingredient not found" },
              });
            }

            let data: any = bean;
            if (selectedColumns.length > 0 && !selectedColumns.includes("*")) {
              data = {};
              selectedColumns.forEach((col) => {
                if (bean[col] !== undefined) {
                  data[col] = bean[col];
                }
              });
            }

            capturedBeanId = null;
            selectedColumns = [];
            return Promise.resolve({
              data,
              error: null,
            });
          });
        }

        return mockFrom;
      });

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: 100,
              text: jest
                .fn()
                .mockResolvedValue("ingredient_id,new_quantity\nbean-1,100"),
            };
          }
          if (name === "mode") {
            return "partial";
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBeGreaterThan(0);
      expect(data.errors.some((e: any) => e.error.includes("reason"))).toBe(
        true
      );
    });
  });

  describe("Successful Import", () => {
    beforeEach(() => {
      const beansMap: Record<string, any> = {
        "bean-1": mockBean1,
        "bean-2": mockBean2,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "beans") {
          let capturedBeanId: string | null = null;
          let selectedColumns: string[] = [];

          mockFrom.select.mockImplementation((columns: string | string[]) => {
            selectedColumns = Array.isArray(columns) ? columns : [columns];
            return mockFrom;
          });

          mockFrom.eq.mockImplementation((column: string, value: string) => {
            if (column === "id") {
              capturedBeanId = value;
            }
            return mockFrom;
          });

          mockFrom.single.mockImplementation(() => {
            const bean = beansMap[capturedBeanId || ""];
            capturedBeanId = null;

            if (!bean) {
              return Promise.resolve({
                data: null,
                error: { message: "Ingredient not found" },
              });
            }

            let data: any = bean;
            if (selectedColumns.length > 0 && !selectedColumns.includes("*")) {
              data = {};
              selectedColumns.forEach((col) => {
                if (bean[col] !== undefined) {
                  data[col] = bean[col];
                }
              });
            }

            selectedColumns = [];
            return Promise.resolve({
              data,
              error: null,
            });
          });

          const updateChain = {
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
          mockFrom.update = jest.fn().mockReturnValue(updateChain);
        } else if (table === "bean_stock_audit_log") {
          mockFrom.insert.mockResolvedValue({
            data: [{ id: "audit-123" }],
            error: null,
          });
        }

        return mockFrom;
      });
    });

    it("should successfully import valid CSV rows", async () => {
      const beansMap: Record<string, any> = {
        "bean-1": mockBean1,
        "bean-2": mockBean2,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "beans") {
          let capturedBeanId: string | null = null;
          mockFrom.eq = jest.fn((column: string, value: string) => {
            if (column === "id") {
              capturedBeanId = value;
            }
            return mockFrom;
          });
          mockFrom.single = jest.fn(() => {
            const bean = beansMap[capturedBeanId || ""];
            capturedBeanId = null;
            return Promise.resolve({
              data: bean || null,
              error: bean ? null : { message: "Ingredient not found" },
            });
          });
          mockFrom.update = jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          });
        } else if (table === "bean_stock_audit_log") {
          mockFrom.insert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: [{ id: "audit-123" }],
              error: null,
            }),
          });
        }

        return mockFrom;
      });

      const csvContent = `ingredient_id,new_quantity,reason,note
bean-1,1500,Restock,Weekly delivery
bean-2,600,Waste,Spoiled batch`;

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: csvContent.length,
              text: jest.fn().mockResolvedValue(csvContent),
            };
          }
          if (name === "mode") {
            return "partial";
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.errors).toHaveLength(0);
    });

    it("should handle partial mode with some invalid rows", async () => {
      const csvContent = `ingredient_id,new_quantity,reason
bean-1,1500,Restock
invalid-id,100,Restock
bean-2,-50,Waste`;

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: csvContent.length,
              text: jest.fn().mockResolvedValue(csvContent),
            };
          }
          if (name === "mode") {
            return "partial";
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(1);
      expect(data.failed).toBeGreaterThan(0);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it("should reject all rows in all-or-nothing mode when any row is invalid", async () => {
      const csvContent = `ingredient_id,new_quantity,reason
bean-1,1500,Restock
invalid-id,100,Restock`;

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: csvContent.length,
              text: jest.fn().mockResolvedValue(csvContent),
            };
          }
          if (name === "mode") {
            return "all-or-nothing";
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(0);
      expect(data.failed).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "manager" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockFrom);
    });

    it("should handle database errors during import", async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          update: jest.fn().mockReturnThis(),
        };

        if (table === "user_roles") {
          mockFrom.single.mockResolvedValue({
            data: { role: "manager" },
            error: null,
          });
        } else if (table === "beans") {
          mockFrom.single.mockResolvedValue({
            data: mockBean1,
            error: null,
          });
          const updateChain = {
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          };
          mockFrom.update = jest.fn().mockReturnValue(updateChain);
        }

        return mockFrom;
      });

      const csvContent = `ingredient_id,new_quantity,reason
bean-1,1500,Restock`;

      const mockFormData = {
        get: jest.fn((name: string) => {
          if (name === "file") {
            return {
              name: "test.csv",
              type: "text/csv",
              size: csvContent.length,
              text: jest.fn().mockResolvedValue(csvContent),
            };
          }
          if (name === "mode") {
            return "partial";
          }
          return null;
        }),
      };

      const request = {
        ...createMockRequest(
          "http://localhost:3000/api/manager/ingredients/bulk-import",
          {
            method: "POST",
          }
        ),
        formData: jest.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBeGreaterThan(0);
      expect(data.errors.some((e: any) => e.error.includes("Database"))).toBe(
        true
      );
    });
  });
});
