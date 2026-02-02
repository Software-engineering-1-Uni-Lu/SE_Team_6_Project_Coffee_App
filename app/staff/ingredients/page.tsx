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

export default function StaffIngredientsPage() {
  const { user, role, loading } = useUser();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [notifications, setNotifications] = useState<
    MissingIngredientNotification[]
  >([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "resolved">(
    "pending"
  );

  // Redirect if not authenticated or not staff
  useEffect(() => {
    if (!loading && (!user || !["staff", "manager", "admin"].includes(role))) {
      router.push("/auth/login");
    }
  }, [user, role, loading, router]);

  // Fetch ingredients
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch("/api/ingredients");
        if (!response.ok) throw new Error("Failed to fetch ingredients");
        const data = await response.json();
        setIngredients(data.ingredients || []);
      } catch (err) {
        console.error("Error fetching ingredients:", err);
        setError("Failed to load ingredients");
      } finally {
        setLoadingIngredients(false);
      }
    };

    if (user) {
      fetchIngredients();
    }
  }, [user]);

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

    if (user) {
      fetchNotifications();
    }
  }, [user, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedIngredient) {
      setError("Please select an ingredient");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/ingredients/missing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bean_id: selectedIngredient,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to report missing ingredient");
      }

      setSuccess("Missing ingredient reported successfully!");
      setSelectedIngredient("");
      setNote("");

      // Refresh notifications
      const notifResponse = await fetch(
        `/api/ingredients/missing?status=${activeTab === "all" ? "all" : activeTab}`
      );
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error("Error reporting missing ingredient:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to report missing ingredient"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getLowStockIngredients = () => {
    return ingredients.filter(
      (ing) => ing.stock_quantity <= ing.low_stock_threshold
    );
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

  if (loading || loadingIngredients) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(35,20%,95%)]">
        <p className="text-[hsl(25,35%,45%)]">Loading...</p>
      </div>
    );
  }

  if (!user || !["staff", "manager", "admin"].includes(role)) {
    return null;
  }

  const lowStockItems = getLowStockIngredients();

  return (
    <div className="min-h-screen bg-[hsl(35,20%,95%)]">
      {/* Header */}
      <header className="border-b border-[hsl(35,20%,90%)] bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
                Missing Ingredients
              </h1>
              <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
                Report and track missing or low stock ingredients
              </p>
            </div>
            <Link
              href="/staff"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Report Form and Low Stock Alert */}
          <div className="space-y-6 lg:col-span-1">
            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-amber-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-900">
                      Low Stock Alert
                    </h3>
                    <div className="mt-2 text-sm text-amber-800">
                      <p className="mb-2">
                        {lowStockItems.length} ingredient
                        {lowStockItems.length !== 1 ? "s" : ""} running low:
                      </p>
                      <ul className="list-inside list-disc space-y-1">
                        {lowStockItems.map((item) => (
                          <li key={item.id}>
                            {item.name} ({item.stock_quantity}
                            {item.unit})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Report Form */}
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[hsl(25,35%,25%)]">
                Report Missing Ingredient
              </h2>

              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="ingredient"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Ingredient *
                  </label>
                  <select
                    id="ingredient"
                    value={selectedIngredient}
                    onChange={(e) => setSelectedIngredient(e.target.value)}
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                    required
                  >
                    <option value="">Select an ingredient</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.stock_quantity}
                        {ing.unit} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="note"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Note (optional)
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                    placeholder="Add any additional details..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 font-medium text-white transition-colors hover:bg-[hsl(25,35%,20%)] disabled:cursor-not-allowed disabled:bg-[hsl(25,35%,60%)]"
                >
                  {submitting ? "Reporting..." : "Report Missing"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Notifications List */}
          <div className="lg:col-span-2">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
