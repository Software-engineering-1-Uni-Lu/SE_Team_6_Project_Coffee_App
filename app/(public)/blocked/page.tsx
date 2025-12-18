"use client";

/**
 * Blocked User Page - /blocked
 *
 * PURPOSE:
 * Displays a message to users who have been blocked from accessing the application.
 * Provides information about why they can't access the app and how to get help.
 *
 * USER STORY SATISFIED:
 * - CSA-57: Blocked user handling
 *   - Dedicated page for blocked users
 *   - Explains why they can't access the application
 *   - Provides contact information for support
 *   - Allows logout (only action available to blocked users)
 *   - Middleware redirects blocked users here automatically
 *
 * SECURITY NOTES:
 * - Middleware enforces that only blocked users can access this page
 * - Non-blocked users are redirected to home
 * - Users can logout but cannot access any other pages
 * - Cannot update account or perform any actions while blocked
 *
 * BEHAVIOR:
 * 1. Middleware detects user.user_metadata.blocked === true
 * 2. Redirects user to /blocked
 * 3. User sees this page explaining their blocked status
 * 4. Only available action is logout
 * 5. If user tries to access any other page, middleware redirects back here
 *
 * ADMIN WORKFLOW (not in this file):
 * - Admin can block users by updating user_metadata.blocked = true
 * - Admin can unblock by setting blocked = false
 * - Once unblocked, user can access app normally
 *
 * UX CONSIDERATIONS:
 * - Clear explanation of blocked status
 * - Contact information for support
 * - Logout button (only available action)
 * - Professional, non-hostile tone
 * - Information about account status
 */

import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/useUser";

export default function BlockedPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  /**
   * Handle logout
   * Only action available to blocked users
   */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Redirect to home page after logout
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  /**
   * LOADING STATE
   * Show while checking user status
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Icon/Visual Indicator */}
        <div className="flex justify-center">
          <div className="rounded-full bg-error/10 p-4">
            <svg
              className="h-12 w-12 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Account Blocked
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been temporarily blocked
          </p>
        </div>

        {/* Content */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="space-y-4 text-sm text-card-foreground">
            <p>
              We&apos;re sorry, but your account has been blocked and you cannot
              access Café Aroma at this time.
            </p>

            <p>This may have occurred due to:</p>

            <ul className="list-inside list-disc space-y-1 pl-4 text-muted-foreground">
              <li>Violation of our terms of service</li>
              <li>Suspicious account activity</li>
              <li>Administrative action</li>
              <li>Security concerns</li>
            </ul>

            {/* User Email (if available) */}
            {user?.email && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Account Email
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Support Information */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold text-card-foreground">
            Need Help?
          </h2>

          <div className="space-y-3 text-sm text-card-foreground">
            <p>
              If you believe this is a mistake or would like to appeal this
              decision, please contact our support team:
            </p>

            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                support@cafearoma.com
              </p>
              <p>
                <span className="font-medium text-foreground">Phone:</span>{" "}
                (555) 123-4567
              </p>
              <p>
                <span className="font-medium text-foreground">Hours:</span>{" "}
                Monday-Friday, 9am-5pm EST
              </p>
            </div>

            <p className="text-xs">
              Please include your account email address when contacting support
              for faster assistance.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary-hover"
          >
            Log Out
          </button>

          {/* Back to Home (will redirect back here if still blocked) */}
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Home
          </button>
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            For more information, please review our{" "}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
