/**
 * Purpose: Audit log viewer for stock changes.
 * Part of CSA-214: Modify In-Stock Quantity
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/src/integrations/supabase/client";

interface AuditLogEntry {
  id: string;
  item_id: string;
  item_name: string | null;
  user_id: string;
  user_name: string | null;
  old_quantity: number;
  new_quantity: number;
  reason: string;
  note: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface Ingredient {
  id: string;
  name: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState({
    ingredient_id: "",
    user_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    fetchAuditLog();
  }, [currentPage, filters]);

  const fetchIngredients = async () => {
    try {
      setLoadingIngredients(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("items")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setIngredients(data || []);
    } catch (error: any) {
      console.error("Error fetching ingredients:", error);
      toast.error("Failed to load ingredients");
    } finally {
      setLoadingIngredients(false);
    }
  };

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      });

      if (filters.ingredient_id) {
        params.append("ingredient_id", filters.ingredient_id);
      }
      if (filters.user_id) {
        params.append("user_id", filters.user_id);
      }
      if (filters.start_date) {
        params.append("start_date", filters.start_date);
      }
      if (filters.end_date) {
        params.append("end_date", filters.end_date);
      }
      if (filters.reason) {
        params.append("reason", filters.reason);
      }

      const response = await fetch(
        `/api/manager/ingredients/audit-log?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch audit log");
      }

      const data = await response.json();
      setEntries(data.data || []);
      setPagination(data.pagination || null);
    } catch (error: any) {
      console.error("Error fetching audit log:", error);
      toast.error(error.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.ingredient_id) {
        params.append("ingredient_id", filters.ingredient_id);
      }
      if (filters.user_id) {
        params.append("user_id", filters.user_id);
      }
      if (filters.start_date) {
        params.append("start_date", filters.start_date);
      }
      if (filters.end_date) {
        params.append("end_date", filters.end_date);
      }
      if (filters.reason) {
        params.append("reason", filters.reason);
      }

      const response = await fetch(
        `/api/manager/ingredients/audit-log/export?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to export audit log");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock_audit_log_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Audit log exported successfully");
    } catch (error: any) {
      console.error("Error exporting audit log:", error);
      toast.error(error.message || "Failed to export audit log");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      ingredient_id: "",
      user_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
            Stock Audit Log
          </h1>
          <p className="mt-2 text-[hsl(25,35%,45%)]">
            View all stock quantity changes and their history
          </p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
        >
          Export to CSV
        </button>
      </header>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-[hsl(35,20%,90%)] bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[hsl(25,35%,25%)]">
            Filters
          </h2>
          <button
            onClick={clearFilters}
            className="text-sm text-[hsl(25,35%,45%)] hover:text-[hsl(25,35%,25%)]"
          >
            Clear All
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label
              htmlFor="ingredient_id_filter"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Ingredient
            </label>
            <select
              id="ingredient_id_filter"
              value={filters.ingredient_id}
              onChange={(e) =>
                handleFilterChange("ingredient_id", e.target.value)
              }
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
              disabled={loadingIngredients}
            >
              <option value="">All Ingredients</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="start_date"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
            />
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
            />
          </div>
          <div>
            <label
              htmlFor="reason_filter"
              className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Reason
            </label>
            <select
              id="reason_filter"
              value={filters.reason}
              onChange={(e) => handleFilterChange("reason", e.target.value)}
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
            >
              <option value="">All Reasons</option>
              <option value="Restock">Restock</option>
              <option value="Waste">Waste</option>
              <option value="Correction">Correction</option>
              <option value="Manual Adjustment">Manual Adjustment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
              <p className="text-[hsl(25,35%,25%)]">Loading audit log...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-[hsl(25,35%,45%)]">
            No audit log entries found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-[hsl(35,20%,95%)]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      Date/Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      Old Qty
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      New Qty
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[hsl(25,35%,25%)]">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b hover:bg-[hsl(35,20%,98%)]"
                    >
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,25%)]">
                        {entry.item_name || entry.item_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                        {entry.user_name || entry.user_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,25%)]">
                        {entry.old_quantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[hsl(25,35%,25%)]">
                        {entry.new_quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                        <span className="rounded-full bg-[hsl(35,20%,90%)] px-2 py-1 text-xs">
                          {entry.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                        {entry.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="border-t px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[hsl(25,35%,45%)]">
                    Showing page {pagination.page} of {pagination.total_pages} (
                    {pagination.total} total entries)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-3 py-1 text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.total_pages, p + 1)
                        )
                      }
                      disabled={currentPage === pagination.total_pages}
                      className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-3 py-1 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
