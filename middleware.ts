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
import type { UserRole } from "@/src/lib/auth-utils";

/**
 * Helper function to get user role from database using the middleware's Supabase client
 * This is necessary because getUserRole() from auth.ts creates a different client context
 */
async function getRoleFromDB(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return "customer"; // Default fallback
  }

  return (data.role as UserRole) || "customer";
}

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
   * BLOCKED USER CHECK (CSA-57)
   *
   * HIGHEST PRIORITY: Check if user is blocked BEFORE any other route checks
   * If user is blocked, redirect to /blocked page
   * Exception: Allow access to /blocked page itself and logout
   *
   * IMPORTANT: Uses direct database query with middleware's Supabase client
   * to ensure blocked status is always current and cannot be tampered with.
   *
   * This check happens FIRST to ensure blocked users cannot access ANY routes,
   * including public routes like /menu, /about, etc.
   */
  if (user) {
    // Query blocked status directly using middleware's supabase client
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("blocked")
      .eq("id", user.id)
      .single();

    const isBlocked = profileData?.blocked === true;

    if (isBlocked) {
      // Allow access to /blocked page, logout, and user API endpoint
      if (
        pathname !== "/blocked" &&
        !pathname.startsWith("/api/auth/logout") &&
        pathname !== "/api/auth/user"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/blocked";
        return NextResponse.redirect(url);
      }
      return response;
    }
  }

  /**
   * PUBLIC ROUTES
   * These routes are accessible to everyone (except blocked users - checked above)
   */
  const publicRoutes = ["/", "/menu", "/about", "/contact", "/checkout"];
  if (publicRoutes.includes(pathname)) {
    return response;
  }

  /**
   * ORDER CONFIRMATION ROUTES
   * These routes are accessible to everyone (guests and authenticated users)
   * Guests need to access order confirmation after checkout
   */
  if (pathname.startsWith("/order-confirmation/")) {
    return response;
  }

  /**
   * /blocked PAGE ACCESS
   *
   * Only blocked users should access this page
   * If not blocked, redirect to home
   */
  if (pathname === "/blocked") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Check if user is actually blocked
    const { data: profileData } = await supabase
      .from("profiles")
      .select("blocked")
      .eq("id", user.id)
      .single();

    const isBlocked = profileData?.blocked === true;

    if (!isBlocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * AUTH ROUTES (/auth/login, /auth/register, /auth/register/staff)
   *
   * BEHAVIOR:
   * If user is already authenticated, redirect to their role-specific dashboard.
   * This prevents logged-in users from accessing login/register pages.
   *
   * REDIRECT LOGIC (UPDATED):
   * - Admin → /staff (preparation/management dashboard)
   * - Manager → /staff (preparation/management dashboard)
   * - Staff → /staff (operational dashboard)
   * - Customer → /menu (customer menu browsing)
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
      const role = await getRoleFromDB(supabase, user.id);
      const url = request.nextUrl.clone();

      /**
       * Role-based dashboard redirect
       * This is the AUTHORITATIVE redirect logic for logged-in users
       */
      if (role === "staff" || role === "manager" || role === "admin") {
        // All operational/management roles go to /staff dashboard
        url.pathname = "/staff";
      } else {
        // customer or any other role defaults to menu
        url.pathname = "/menu";
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

    const role = await getRoleFromDB(supabase, user.id);
    if (role !== "customer") {
      const url = request.nextUrl.clone();
      // Redirect to appropriate dashboard
      url.pathname =
        role === "admin" || role === "manager" ? "/admin" : "/staff";
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * STAFF ROUTES (/staff, /staff/*)
   *
   * BEHAVIOR (UPDATED):
   * - Staff: Allow access
   * - Manager: Allow access (managers have access to operational dashboard)
   * - Admin: Allow access (admins can help with operations)
   * - Customer: Redirect to /menu
   * - Unauthenticated: Redirect to /auth/login
   *
   * ARCHITECTURE NOTE:
   * Staff dashboard is the PRIMARY dashboard for staff, manager, and admin roles.
   * It contains both operational tasks (order queue, prep station) and
   * management features (accessible based on role permissions).
   *
   * FOR UI DEVELOPERS:
   * - This is the main dashboard for all non-customer roles
   * - Role-based UI should hide/show features within this dashboard
   * - DO NOT redirect managers/admins away from /staff
   */
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = await getRoleFromDB(supabase, user.id);

    if (role === "customer") {
      const url = request.nextUrl.clone();
      // Customers can't access staff features
      url.pathname = "/menu";
      return NextResponse.redirect(url);
    }

    // Staff, manager, and admin can all access /staff routes
    return response;
  }

  /**
   * ADMIN ROUTES (/admin, /admin/*)
   *
   * BEHAVIOR (UPDATED):
   * - Admin: Allow access
   * - Manager: Allow access (managers can access admin dashboard)
   * - Staff: Redirect to /staff
   * - Customer: Redirect to /menu
   * - Unauthenticated: Redirect to /auth/login
   *
   * ARCHITECTURE NOTE (UPDATED):
   * Admin dashboard is accessible to both managers and admins.
   * Managers have the same dashboard access but fewer permissions
   * (permission enforcement is handled at the feature level, not routing).
   *
   * ROLE HIERARCHY:
   * - /admin: Management dashboard (accessible to manager + admin)
   * - /staff: Primary dashboard (accessible to staff + manager + admin)
   * - /menu: Customer dashboard
   *
   * FOR UI DEVELOPERS:
   * - Both manager and admin can access /admin routes
   * - Permission checks within features determine what actions are allowed
   * - DO NOT add route-level restrictions between manager and admin
   */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = await getRoleFromDB(supabase, user.id);

    if (role === "customer") {
      const url = request.nextUrl.clone();
      url.pathname = "/menu";
      return NextResponse.redirect(url);
    }
    if (role === "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/staff";
      return NextResponse.redirect(url);
    }

    // Manager and admin can access /admin routes
    return response;
  }

  /**
   * PROFILE AND OTHER PROTECTED ROUTES
   *
   * Routes that require authentication but no specific role
   * Examples: /profile, /cart/checkout
   */
  const protectedRoutes = ["/auth/profile", "/profile", "/cart/checkout"];
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
