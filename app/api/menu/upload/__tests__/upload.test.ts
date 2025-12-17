/**
 * Tests for POST /api/menu/upload
 */

import { POST } from "@/app/api/menu/upload/route";
import {
  createMockRequest,
  mockUsers,
  createMockSupabaseClient,
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

describe("POST /api/menu/upload", () => {
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

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });
  });

  describe("Role Authorization", () => {
    it("should return 403 for customer", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.customer },
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

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can upload images");
    });

    it("should return 403 for staff", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.staff },
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

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only managers and admins can upload images");
    });
  });

  describe("File Validation", () => {
    it("should return 400 when no file provided", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      const formData = new FormData();

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });

    it("should return 400 for invalid file type", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.txt", { type: "text/plain" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid file type. Only JPEG, PNG, and WebP are allowed"
      );
    });

    it("should return 400 for file exceeding size limit", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      const largeContent = new Uint8Array(6 * 1024 * 1024); // 6MB
      const formData = new FormData();
      formData.append(
        "file",
        new File([largeContent], "large.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("File size exceeds 5MB limit");
    });
  });

  describe("Successful Upload", () => {
    it("should upload image successfully for manager", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: "menu-items/test.jpg" },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: "https://example.com/test.jpg" },
          }),
        }),
      };

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
      expect(data.path).toBeDefined();
    });

    it("should upload image successfully for admin", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.admin },
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
      });

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: "menu-items/test.png" },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: "https://example.com/test.png" },
          }),
        }),
      };

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.png", { type: "image/png" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
      expect(data.path).toBeDefined();
    });

    it("should accept webp images", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: "menu-items/test.webp" },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: "https://example.com/test.webp" },
          }),
        }),
      };

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.webp", { type: "image/webp" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });
  });

  describe("Upload Errors", () => {
    it("should return 500 when storage upload fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.manager },
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

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Storage error" },
          }),
        }),
      };

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Storage error");
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "test.jpg", { type: "image/jpeg" })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/menu/upload",
        {
          method: "POST",
        }
      );
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
