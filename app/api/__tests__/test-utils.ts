/**
 * API Route Testing Utilities
 *
 * PURPOSE:
 * Provides helper functions and mocks for testing Next.js API routes.
 * Handles Supabase client mocking, authentication, and common test scenarios.
 *
 * KEY FEATURES:
 * - Mock Supabase server client for API routes
 * - Mock authentication contexts (authenticated, unauthenticated, different roles)
 * - Mock cookies() from next/headers
 * - Helper functions for creating test requests
 * - Type-safe mocks with proper TypeScript support
 *
 * NOTE: This file provides utilities for other tests and doesn't contain tests itself.
 */

import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Export a dummy test to avoid "no tests" error
// This file is a utility module, not a test suite
describe("Test Utilities", () => {
  it("exports utility functions for API testing", () => {
    expect(typeof createMockSupabaseClient).toBe("function");
    expect(typeof createMockRequest).toBe("function");
  });
});

/**
 * Mock user data for different scenarios
 */
export const mockUsers = {
  customer: {
    id: "customer-123",
    email: "customer@test.com",
    user_metadata: { role: "customer" },
    created_at: "2024-01-01T00:00:00.000Z",
  },
  staff: {
    id: "staff-123",
    email: "staff@test.com",
    user_metadata: { role: "staff" },
    created_at: "2024-01-01T00:00:00.000Z",
  },
  manager: {
    id: "manager-123",
    email: "manager@test.com",
    user_metadata: { role: "manager" },
    created_at: "2024-01-01T00:00:00.000Z",
  },
  admin: {
    id: "admin-123",
    email: "admin@test.com",
    user_metadata: { role: "admin" },
    created_at: "2024-01-01T00:00:00.000Z",
  },
  blocked: {
    id: "blocked-123",
    email: "blocked@test.com",
    user_metadata: { role: "customer", blocked: true },
    created_at: "2024-01-01T00:00:00.000Z",
  },
};

/**
 * Create a mock Supabase client for API route testing
 */
export function createMockSupabaseClient(
  options: {
    user?: any;
    authError?: any;
    dbData?: any;
    dbError?: any;
    rpcData?: any;
    rpcError?: any;
  } = {}
) {
  const {
    user = null,
    authError = null,
    dbData = null,
    dbError = null,
    rpcData = null,
    rpcError = null,
  } = options;

  const mockClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: authError,
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: jest.fn().mockResolvedValue({
      data: rpcData,
      error: rpcError,
    }),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: dbData, error: dbError }),
      order: jest.fn().mockResolvedValue({ data: dbData, error: dbError }),
      // For chaining without terminal operation
      then: jest.fn((resolve) => resolve({ data: dbData, error: dbError })),
    })),
  };

  return mockClient as unknown as SupabaseClient;
}

/**
 * Mock cookies() from next/headers
 */
export function mockCookies(cookieData: Record<string, string> = {}) {
  return {
    get: jest.fn((name: string) => ({
      name,
      value: cookieData[name] || "",
    })),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn((name: string) => name in cookieData),
    getAll: jest.fn(() =>
      Object.entries(cookieData).map(([name, value]) => ({ name, value }))
    ),
  };
}

/**
 * Mock createServerClient from @supabase/ssr
 * Returns a factory function that creates mock clients
 */
export function mockCreateServerClient(mockClient: any) {
  return jest.fn(() => mockClient);
}

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", body = null, headers = {} } = options;

  const request = {
    url,
    method,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(body ? JSON.stringify(body) : ""),
    nextUrl: new URL(url),
  } as unknown as NextRequest;

  return request;
}

/**
 * Helper to setup authentication mocks for a specific user role
 */
export function setupAuthMock(role: keyof typeof mockUsers | null) {
  const user = role ? mockUsers[role] : null;

  return {
    user,
    mockClient: createMockSupabaseClient({ user }),
  };
}

/**
 * Helper to setup role-based authorization mock
 * Returns user, their role data, and configured mock client
 */
export function setupRoleAuthMock(
  role: "customer" | "staff" | "manager" | "admin"
) {
  const user = mockUsers[role];
  const roleData = { role };

  const mockClient = createMockSupabaseClient({ user, dbData: roleData });

  return {
    user,
    role,
    roleData,
    mockClient,
  };
}

/**
 * Helper to test authentication enforcement
 * Verifies that an endpoint returns 401 for unauthenticated requests
 */
export async function expectAuthenticationRequired(
  handler: Function,
  request: NextRequest
) {
  const mockClient = createMockSupabaseClient({ user: null });

  // Mock the Supabase client creation
  const mockCreateClient = jest.fn(() => mockClient);

  const response = await handler(request);
  const data = await response.json();

  expect(response.status).toBe(401);
  expect(data.error).toBeDefined();
}

/**
 * Helper to test authorization enforcement
 * Verifies that an endpoint returns 403 for unauthorized roles
 */
export async function expectAuthorizationRequired(
  handler: Function,
  request: NextRequest,
  userRole: string
) {
  const user = mockUsers[userRole as keyof typeof mockUsers];
  const mockClient = createMockSupabaseClient({
    user,
    dbData: { role: userRole },
  });

  const response = await handler(request);
  const data = await response.json();

  expect(response.status).toBe(403);
  expect(data.error).toBeDefined();
}

/**
 * Mock blocked user check function
 */
export function mockIsBlocked(blocked: boolean = false) {
  return jest.fn().mockReturnValue(blocked);
}

/**
 * Mock blocked user database check
 */
export function mockIsBlockedFromDB(blocked: boolean = false) {
  return jest.fn().mockResolvedValue(blocked);
}

/**
 * Helper to extract JSON from NextResponse
 */
export async function getResponseJSON(response: any) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Helper to create mock menu items for testing
 */
export const mockMenuItems = [
  {
    id: 1,
    category_id: 1,
    name: "Espresso",
    slug: "espresso",
    description: "Strong coffee",
    price_cents: 250,
    image_url: "/images/espresso.jpg",
    allergens: [],
    vegetarian: true,
    vegan: true,
    active: true,
    category: { id: 1, name: "Coffee", slug: "coffee" },
  },
  {
    id: 2,
    category_id: 1,
    name: "Cappuccino",
    slug: "cappuccino",
    description: "Espresso with steamed milk",
    price_cents: 400,
    image_url: "/images/cappuccino.jpg",
    allergens: ["dairy"],
    vegetarian: true,
    vegan: false,
    active: true,
    category: { id: 1, name: "Coffee", slug: "coffee" },
  },
];

/**
 * Helper to create mock order data for testing
 */
export const mockOrder = {
  id: 1,
  customer_id: "customer-123",
  status: "pending",
  subtotal_cents: 650,
  tax_cents: 52,
  total_cents: 702,
  payment_method: "card",
  payment_status: "pending",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

/**
 * Helper to create mock order items
 */
export const mockOrderItems = [
  {
    item_id: 1,
    quantity: 1,
    unit_price_cents: 250,
    subtotal_cents: 250,
    size: "regular",
    modifiers: [],
  },
  {
    item_id: 2,
    quantity: 1,
    unit_price_cents: 400,
    subtotal_cents: 400,
    size: "large",
    modifiers: ["extra-shot"],
  },
];
