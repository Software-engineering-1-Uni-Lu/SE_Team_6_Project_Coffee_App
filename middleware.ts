/**
 * Next.js Middleware - Route Protection and Authentication
 *
 * ============================================================================
 * PURPOSE:
 * ============================================================================
 * This middleware runs on every request and handles authentication-based
 * routing, role-based access control, and blocked user redirection.
 * It enforces the three-tier dashboard architecture (customer, staff, admin).
 *
 * ============================================================================
 * USER STORIES SATISFIED:
 * ============================================================================
 * - CSA-48: Role-based access / dashboard redirect
 *   - /customer → only customers (redirects others to their dashboard)
 *   - /staff, /staff/* → only staff + admin
 *   - /admin, /admin/* → only admin
 *   - /auth/* → blocked for authenticated users (redirect to dashboard)
 *   - Automatic redirects based on user role
 *
 * - CSA-53: Persistent session
 *   - Updates Supabase session on each request
 *   - Refreshes session tokens when needed
 *   - Maintains authentication state across requests
 *
 * - CSA-57: Blocked user handling
 *   - Checks user.user_metadata.blocked on every request
 *   - Redirects blocked users to /blocked page
 *   - Prevents blocked users from accessing protected routes
 *
 * ============================================================================
 * ROLE-BASED DASHBOARD ARCHITECTURE:
 * ============================================================================
 * Three-tier system with strict separation:
 *
 * 1. CUSTOMER DASHBOARD (/customer)
 *    - Access: Customers only
 *    - Features: Menu browsing, ordering, order tracking, loyalty points
 *    - Redirect: Staff → /staff, Admin → /admin
 *
 * 2. STAFF DASHBOARD (/staff, /staff/*)
 *    - Access: Staff + Admin (admin can help with operations)
 *    - Features: Order queue, prep station, order status management
 *    - Redirect: Customer → /customer
 *
 * 3. ADMIN DASHBOARD (/admin, /admin/*)
 *    - Access: Admin only
 *    - Features: User management, menu management, settings, reports, ALL staff features
 *    - Redirect: Customer → /customer, Staff → /staff
 *
 * ============================================================================
 * SECURITY CONSIDERATIONS:
 * ============================================================================
 * - Runs on edge runtime for performance
 * - Validates session on every protected route access
 * - Session refresh happens automatically
 * - Prevents client-side session tampering
 * - Role validation happens server-side (from user.user_metadata)
 * - Dashboard pages perform secondary checks (defense in depth)
 *
 * ============================================================================
 * ROUTE PROTECTION RULES (IN ORDER OF EVALUATION):
 * ============================================================================
 * 1. Public routes (/, /menu, /about, /contact): Accessible to everyone
 * 2. Blocked user check: Redirect to /blocked (except /blocked and logout)
 * 3. /blocked page: Only for blocked users
 * 4. /auth/* routes: Only for non-authenticated users
 *    - Logged in → redirect to role-based dashboard
 * 5. /customer: Only for customers
 *    - Staff → /staff, Admin → /admin, Unauthenticated → /auth/login
 * 6. /staff, /staff/*: Only for staff + admin
 *    - Customer → /customer, Unauthenticated → /auth/login
 * 7. /admin, /admin/*: Only for admin
 *    - Customer → /customer, Staff → /staff, Unauthenticated → /auth/login
 * 8. Other protected routes (/auth/profile, etc.): Require authentication
 *
 * ============================================================================
 * FOR UI DEVELOPERS - IMPORTANT NOTES:
 * ============================================================================
 *
 * DO NOT MODIFY THIS FILE unless adding new route protection rules.
 *
 * This middleware is the FIRST LINE OF DEFENSE for route protection.
 * Dashboard pages (customer/page.tsx, staff/page.tsx, admin/page.tsx)
 * perform SECOND LINE checks for defense in depth.
 *
 * ADDING NEW ROUTES:
 * - Public routes: Add to publicRoutes array
 * - Protected routes: Add to protectedRoutes array or create new if-block
 * - Role-specific routes: Follow existing /admin/* or /staff/* pattern
 *
 * NAVIGATION BEHAVIOR:
 * - Login always redirects to role-based dashboard
 * - Attempting to access wrong dashboard redirects to correct one
 * - Unauthenticated users always redirect to /auth/login with ?redirect=
 *
 * ============================================================================
 * PERFORMANCE NOTES:
 * ============================================================================
 * - Middleware runs on Edge Runtime for low latency
 * - Session validation is cached by Supabase
 * - Minimal processing for public routes
 * - Early returns for performance (public routes skip all checks)
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole, isBlocked } from "@/src/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Create response object
   * We'll modify this as needed and return it at the end
   */
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  /**
   * Create Supabase server client for middleware
   *
   * IMPORTANT: Middleware uses a special Supabase client that can
   * read and write cookies, which is necessary for session management
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          /**
           * Set cookie on both request and response
           * Request: Makes cookie available to Server Components
           * Response: Sends updated cookie back to browser
           */
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          /**
           * Remove cookie from both request and response
           */
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  /**
   * Get current user session
   *
   * This also refreshes the session if needed, updating tokens
   * and extending the session expiry time
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * ROUTE PROTECTION LOGIC
   */

  /**
   * PUBLIC ROUTES
   * These routes are accessible to everyone, no checks needed
   */
  const publicRoutes = ["/", "/menu", "/about", "/contact"];
  if (publicRoutes.includes(pathname)) {
    return response;
  }

  /**
   * BLOCKED USER CHECK (CSA-57)
   *
   * If user is blocked, redirect to /blocked page
   * Exception: Allow access to /blocked page itself and logout
   */
  if (user && isBlocked(user)) {
    if (pathname !== "/blocked" && !pathname.startsWith("/api/auth/logout")) {
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      return NextResponse.redirect(url);
    }
    return response;
  }

  /**
   * /blocked PAGE ACCESS
   *
   * Only blocked users should access this page
   * If not blocked, redirect to home
   */
  if (pathname === "/blocked") {
    if (!user || !isBlocked(user)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return response;
  }

  /**
   * AUTH ROUTES (/auth/login, /auth/register)
   *
   * BEHAVIOR:
   * If user is already authenticated, redirect to their role-specific dashboard.
   * This prevents logged-in users from accessing login/register pages.
   *
   * REDIRECT LOGIC:
   * - Admin → /admin (admin dashboard with full features)
   * - Staff → /staff (staff operational dashboard)
   * - Customer → /customer (customer ordering dashboard)
   *
   * EXCEPTION: /auth/profile is allowed for all authenticated users
   * (handled in protectedRoutes section below)
   *
   * WHY THIS MATTERS FOR UI DEVELOPERS:
   * This ensures users always land on their correct dashboard after login.
   * Your login form should NOT manually redirect - let this middleware
   * handle it automatically based on role.
   */
  if (pathname.startsWith("/auth") && pathname !== "/auth/profile") {
    if (user) {
      const role = getUserRole(user);
      const url = request.nextUrl.clone();

      /**
       * Role-based dashboard redirect
       * This is the AUTHORITATIVE redirect logic for logged-in users
       */
      if (role === "admin") {
        url.pathname = "/admin";
      } else if (role === "staff") {
        url.pathname = "/staff";
      } else {
        // customer or any other role defaults to customer dashboard
        url.pathname = "/customer";
      }

      return NextResponse.redirect(url);
    }
    // Not logged in, allow access to auth pages
    return response;
  }

  /**
   * CUSTOMER DASHBOARD ROUTE (/customer)
   *
   * BEHAVIOR:
   * - Customers: Allow access
   * - Staff: Redirect to /staff
   * - Admin: Redirect to /admin
   * - Unauthenticated: Redirect to /auth/login
   *
   * ARCHITECTURE NOTE:
   * This enforces strict role separation. Each role has their own dashboard.
   * Cross-role access is prevented here and double-checked in the page itself.
   *
   * FOR UI DEVELOPERS:
   * The /customer page (customer/page.tsx) will perform a secondary check.
   * Do NOT remove the checks in that file - defense in depth is critical.
   */
  if (pathname === "/customer" || pathname.startsWith("/customer/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = getUserRole(user);
    if (role !== "customer") {
      const url = request.nextUrl.clone();
      // Redirect to appropriate dashboard
      url.pathname = role === "admin" ? "/admin" : "/staff";
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * STAFF ROUTES (/staff, /staff/*)
   *
   * BEHAVIOR:
   * - Staff: Allow access
   * - Admin: Allow access (admins can help with operations)
   * - Customer: Redirect to /customer
   * - Unauthenticated: Redirect to /auth/login
   *
   * ARCHITECTURE NOTE:
   * Staff dashboard is for operational tasks (order queue, prep station).
   * Admins can access this dashboard to help with operations when needed.
   * This creates a flexible system where admins can "step down" to staff role.
   *
   * FOR UI DEVELOPERS:
   * - The /staff page (staff/page.tsx) shows admin users an "Admin Access" badge
   * - Admins accessing /staff will see operational tools, not admin tools
   * - For admin features, admins must go to /admin dashboard
   * - Create a "Switch to Admin Dashboard" link in staff layout for admins
   */
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = getUserRole(user);
    if (role !== "staff" && role !== "admin") {
      const url = request.nextUrl.clone();
      // Customers can't access staff features
      url.pathname = "/customer";
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * ADMIN ROUTES (/admin, /admin/*)
   *
   * BEHAVIOR:
   * - Admin: Allow access
   * - Staff: Redirect to /staff
   * - Customer: Redirect to /customer
   * - Unauthenticated: Redirect to /auth/login
   *
   * ARCHITECTURE NOTE:
   * Admin dashboard is ADMIN-ONLY. Unlike /staff (which allows admin access),
   * /admin is restricted to admins only. This is the management dashboard
   * with user management, settings, and system configuration.
   *
   * ADMIN HIERARCHY:
   * - /admin: Admin dashboard (user mgmt, settings, reports)
   * - /staff: Operational dashboard (order queue, prep)
   * - Admins can access both dashboards
   * - Staff can only access /staff
   *
   * FOR UI DEVELOPERS:
   * - In admin dashboard, provide link to /staff for operational tasks
   * - In staff dashboard (when admin), provide link back to /admin
   * - This creates seamless navigation between management and operations
   */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = getUserRole(user);
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      // Redirect based on role
      url.pathname = role === "staff" ? "/staff" : "/customer";
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * PROFILE AND OTHER PROTECTED ROUTES
   *
   * Routes that require authentication but no specific role
   * Examples: /profile, /orders, /cart/checkout
   */
  const protectedRoutes = [
    "/auth/profile",
    "/profile",
    "/orders",
    "/cart/checkout",
  ];
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  /**
   * DEFAULT: Allow request to proceed
   * This includes:
   * - Public pages
   * - API routes (handled separately)
   * - Static assets
   */
  return response;
}

/**
 * Middleware Configuration
 *
 * Specifies which routes the middleware should run on
 * Uses Next.js matcher syntax for path matching
 *
 * EXCLUDES:
 * - _next/static (static files)
 * - _next/image (Next.js image optimization)
 * - favicon.ico
 * - public folder files
 *
 * INCLUDES:
 * - All other routes (/, /admin/*, /auth/*, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
