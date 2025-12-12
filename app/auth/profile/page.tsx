"use client";

/**
 * Profile Page - /auth/profile
 *
 * PURPOSE:
 * Allows authenticated users to view and update their account details.
 * Includes account information display, profile editing, and account deletion.
 *
 * USER STORIES SATISFIED:
 * - CSA-33: View account details
 *   - Displays user profile with metadata
 *   - Shows role and account status
 *   - Uses useUser hook for session data
 *
 * - CSA-38: Modify account details
 *   - Form to update full_name
 *   - Cannot modify own role (admin-only operation)
 *   - Updates user metadata via API
 *
 * - CSA-43: Delete account & data
 *   - Delete account button with confirmation
 *   - Calls delete API endpoint
 *   - Redirects to home after deletion
 *
 * - CSA-29: Log out
 *   - Logout button
 *   - Calls logout API and redirects
 *
 * - CSA-53: Persistent session
 *   - Uses useUser hook to access session
 *   - Automatically updates when user data changes
 *
 * - CSA-57: Blocked user handling
 *   - Displays blocked status if user is blocked
 *   - Blocked users redirected by middleware (shouldn't reach this page)
 *
 * SECURITY NOTES:
 * - Protected route (middleware enforces authentication)
 * - Cannot elevate own role (prevented by API)
 * - Delete requires confirmation
 * - All changes go through API endpoints
 *
 * BEHAVIOR:
 * 1. On load: Fetches current user data via useUser hook
 * 2. Displays user info (email, name, role, blocked status)
 * 3. Edit mode: Allows updating full_name
 * 4. Logout: Calls logout API and redirects
 * 5. Delete: Confirms, calls delete API, redirects to home
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/hooks/useUser";

export default function ProfilePage() {
  const router = useRouter();
  const { user, role, isBlocked, loading } = useUser();

  /**
   * Form state for editing profile
   */
  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  /**
   * UI state
   */
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /**
   * Initialize full name from user data when it loads
   */
  useState(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  });

  /**
   * Handle profile update
   *
   * CSA-38: Modify account details
   * Updates only full_name (role changes not allowed for own account)
   */
  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setUpdating(true);

    try {
      const response = await fetch("/api/auth/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
        setUpdating(false);
        return;
      }

      setSuccess("Profile updated successfully");
      setIsEditing(false);
      setUpdating(false);

      /**
       * Refresh page to show updated data
       * Alternatively, could update local state or call refetch()
       */
      window.location.reload();
    } catch (err) {
      console.error("Update error:", err);
      setError("An unexpected error occurred");
      setUpdating(false);
    }
  };

  /**
   * Handle logout
   *
   * CSA-29: Log out
   */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Redirect to home page
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  /**
   * Handle account deletion
   *
   * CSA-43: Delete account & data
   * Requires confirmation before proceeding
   */
  const handleDelete = async () => {
    /**
     * CONFIRMATION DIALOG
     * Double-check that user wants to delete account
     */
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch("/api/auth/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          confirm: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete account");
        setDeleting(false);
        return;
      }

      /**
       * Account deleted successfully
       * Redirect to home page
       */
      alert("Your account has been deleted");
      router.push("/");
    } catch (err) {
      console.error("Delete error:", err);
      setError("An unexpected error occurred");
      setDeleting(false);
    }
  };

  /**
   * LOADING STATE
   * Show while fetching user data
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  /**
   * NOT AUTHENTICATED
   * Shouldn't happen due to middleware, but handle gracefully
   */
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">
          Please log in to view your profile
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Account Profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-error/10 p-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-success/10 p-4">
            <p className="text-sm text-success">{success}</p>
          </div>
        )}

        {/* Account Information */}
        <div className="space-y-6">
          {/* User Details Card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">
              Account Information
            </h2>

            <dl className="space-y-3">
              {/* Email */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
              </div>

              {/* Full Name */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {user.user_metadata?.full_name || "Not set"}
                </dd>
              </div>

              {/* Role */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {role}
                  </span>
                </dd>
              </div>

              {/* Account Status */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Account Status
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {isBlocked ? (
                    <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                      Active
                    </span>
                  )}
                </dd>
              </div>

              {/* Account Created */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Member Since
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Edit Profile Form */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">
              Update Profile
            </h2>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Edit Profile
              </button>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-foreground"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={updating}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold text-card-foreground">
              Account Actions
            </h2>

            <div className="space-y-3">
              {/* Logout Button */}
              <div>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary-hover"
                >
                  Log Out
                </button>
              </div>

              {/* Delete Account Button */}
              <div className="border-t border-border pt-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md bg-error px-4 py-2 text-sm font-medium text-error-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Warning: This action is permanent and cannot be undone. All
                  your data will be deleted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
