"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/src/hooks/useUser";

interface Ingredient {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
}

interface MissingIngredientNotification {
  id: string;
  bean_id: string;
  reported_by: string;
  status: "pending" | "resolved" | "ignored";
  note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  beans: Ingredient;
  reporter: {
    id: string;
    full_name: string;
    email: string;
  };
  resolver?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function ManagerMissingIngredientsPage() {
  const { user, role, loading } = useUser();
  const router = useRouter();

  const [notifications, setNotifications] = useState<
    MissingIngredientNotification[]
  >([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "resolved">(
    "pending"
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated or not manager/admin
  useEffect(() => {
    if (!loading && (!user || !["manager", "admin"].includes(role))) {
      router.push("/auth/login");
    }
  }, [user, role, loading, router]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const status = activeTab === "all" ? "all" : activeTab;
        const response = await fetch(
          `/api/ingredients/missing?status=${status}`
        );
        if (!response.ok) throw new Error("Failed to fetch notifications");
        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications");
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (user && ["manager", "admin"].includes(role)) {
      fetchNotifications();
    }
  }, [user, role, activeTab]);

  const handleUpdateStatus = async (
    notificationId: string,
    newStatus: "resolved" | "ignored"
  ) => {
    setProcessingId(notificationId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/ingredients/missing/${notificationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update notification");
      }

      setSuccess(
        `Notification marked as ${newStatus === "resolved" ? "resolved" : "ignored"}`
      );

      // Refresh notifications
      const notifResponse = await fetch(
        `/api/ingredients/missing?status=${activeTab === "all" ? "all" : activeTab}`
      );
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error("Error updating notification:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update notification"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    setProcessingId(notificationId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/ingredients/missing/${notificationId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete notification");
      }

      setSuccess("Notification deleted successfully");

      // Refresh notifications
      const notifResponse = await fetch(
        `/api/ingredients/missing?status=${activeTab === "all" ? "all" : activeTab}`
      );
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete notification"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-amber-100 text-amber-800 border-amber-300",
      resolved: "bg-emerald-100 text-emerald-800 border-emerald-300",
      ignored: "bg-gray-100 text-gray-800 border-gray-300",
    };

    return (
      <span
        className={`rounded-full border px-2 py-1 text-xs font-medium ${
          statusStyles[status as keyof typeof statusStyles]
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(35,20%,95%)]">
        <p className="text-[hsl(25,35%,45%)]">Loading...</p>
      </div>
    );
  }

  if (!user || !["manager", "admin"].includes(role)) {
    return null;
  }

  const pendingCount = notifications.filter(
    (n) => n.status === "pending"
  ).length;

  return (
    <div className="min-h-screen bg-[hsl(35,20%,95%)]">
      {/* Header */}
      <header className="border-b border-[hsl(35,20%,90%)] bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
                Missing Ingredients Management
              </h1>
              <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
                Review and manage staff reports of missing or low stock
                ingredients
              </p>
            </div>
            <Link
              href="/manager/dashboard"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alert Messages */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            {success}
          </div>
        )}

        {/* Stats Card */}
        {pendingCount > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center">
              <svg
                className="mr-3 h-5 w-5 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-amber-900">
                {pendingCount} pending notification
                {pendingCount !== 1 ? "s" : ""} require your attention
              </span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
          {/* Tabs */}
          <div className="border-b border-[hsl(35,20%,90%)]">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab("pending")}
                className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "pending"
                    ? "border-[hsl(25,35%,25%)] text-[hsl(25,35%,25%)]"
                    : "border-transparent text-[hsl(25,35%,45%)] hover:border-[hsl(35,20%,80%)] hover:text-[hsl(25,35%,25%)]"
                }`}
              >
                Pending
                {pendingCount > 0 && (
                  <span className="ml-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("resolved")}
                className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "resolved"
                    ? "border-[hsl(25,35%,25%)] text-[hsl(25,35%,25%)]"
                    : "border-transparent text-[hsl(25,35%,45%)] hover:border-[hsl(35,20%,80%)] hover:text-[hsl(25,35%,25%)]"
                }`}
              >
                Resolved
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "border-[hsl(25,35%,25%)] text-[hsl(25,35%,25%)]"
                    : "border-transparent text-[hsl(25,35%,45%)] hover:border-[hsl(35,20%,80%)] hover:text-[hsl(25,35%,25%)]"
                }`}
              >
                All
              </button>
            </nav>
          </div>

          {/* Notifications List */}
          <div className="p-6">
            {loadingNotifications ? (
              <div className="py-8 text-center text-[hsl(25,35%,45%)]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-[hsl(25,35%,45%)]">
                No notifications found
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
                            {notification.beans.name}
                          </h3>
                          {getStatusBadge(notification.status)}
                        </div>

                        <div className="space-y-1 text-sm text-[hsl(25,35%,45%)]">
                          <p>
                            <span className="font-medium text-[hsl(25,35%,25%)]">
                              Current Stock:
                            </span>{" "}
                            {notification.beans.stock_quantity}
                            {notification.beans.unit}
                            {notification.beans.stock_quantity <=
                              notification.beans.low_stock_threshold && (
                              <span className="ml-2 font-medium text-red-600">
                                (Low Stock)
                              </span>
                            )}
                          </p>
                          <p>
                            <span className="font-medium text-[hsl(25,35%,25%)]">
                              Reported by:
                            </span>{" "}
                            {notification.reporter.full_name}
                          </p>
                          <p>
                            <span className="font-medium text-[hsl(25,35%,25%)]">
                              Reported:
                            </span>{" "}
                            {formatDate(notification.created_at)}
                          </p>
                          {notification.note && (
                            <p className="mt-2 italic text-[hsl(25,35%,35%)]">
                              &ldquo;{notification.note}&rdquo;
                            </p>
                          )}
                          {notification.resolved_at &&
                            notification.resolver && (
                              <div className="mt-2 border-t border-[hsl(35,20%,90%)] pt-2">
                                <p>
                                  <span className="font-medium text-[hsl(25,35%,25%)]">
                                    Resolved by:
                                  </span>{" "}
                                  {notification.resolver.full_name}
                                </p>
                                <p>
                                  <span className="font-medium text-[hsl(25,35%,25%)]">
                                    Resolved:
                                  </span>{" "}
                                  {formatDate(notification.resolved_at)}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {notification.status === "pending" && (
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(notification.id, "resolved")
                            }
                            disabled={processingId === notification.id}
                            className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[hsl(25,35%,60%)]"
                          >
                            {processingId === notification.id
                              ? "Processing..."
                              : "Mark Resolved"}
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(notification.id, "ignored")
                            }
                            disabled={processingId === notification.id}
                            className="rounded-md bg-[hsl(25,35%,40%)] px-4 py-2 text-sm text-white transition-colors hover:bg-[hsl(25,35%,30%)] disabled:cursor-not-allowed disabled:bg-[hsl(25,35%,60%)]"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={processingId === notification.id}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[hsl(25,35%,60%)]"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {notification.status !== "pending" && (
                        <div className="ml-4">
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={processingId === notification.id}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[hsl(25,35%,60%)]"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
