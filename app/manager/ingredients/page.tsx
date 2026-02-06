/**
 * Manager ingredients management page.
 * Browse, search, filter, view details, add, edit, and delete ingredients.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/src/integrations/supabase/client";
import { StockAdjustmentModal } from "@/src/components/stock-adjustment-modal";
import { toast } from "sonner";

interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  price_delta_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  supplier: string | null;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  bean_categories: {
    category_id: string;
    categories: { id: string; name: string };
  }[];
}

interface Category {
  id: string;
  name: string;
}

interface IngredientForm {
  name: string;
  description: string;
  price_delta_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  supplier: string;
  unit: string;
  active: boolean;
  category_ids: string[];
}

const emptyForm: IngredientForm = {
  name: "",
  description: "",
  price_delta_cents: 0,
  stock_quantity: 0,
  low_stock_threshold: 5,
  supplier: "",
  unit: "g",
  active: true,
  category_ids: [],
};

export default function ManagerIngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IngredientForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail view
  const [viewingIngredient, setViewingIngredient] = useState<Ingredient | null>(
    null
  );

  // Stock adjustment modal (ingredient = bean)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAdjustingIngredient, setStockAdjustingIngredient] =
    useState<Ingredient | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [ingredientsRes, categoriesRes] = await Promise.all([
        supabase
          .from("beans")
          .select(
            "*, bean_categories(category_id, categories:categories(id, name))"
          )
          .order("name"),
        supabase.from("categories").select("id, name").order("name"),
      ]);

      if (ingredientsRes.error) throw ingredientsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setIngredients(ingredientsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load ingredients"
      );
      toast.error("Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesSearch =
        ing.name.toLowerCase().includes(search.toLowerCase()) ||
        (ing.supplier || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && ing.active) ||
        (statusFilter === "inactive" && !ing.active);
      return matchesSearch && matchesStatus;
    });
  }, [ingredients, search, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      description: ing.description || "",
      price_delta_cents: ing.price_delta_cents,
      stock_quantity: ing.stock_quantity,
      low_stock_threshold: ing.low_stock_threshold,
      supplier: ing.supplier || "",
      unit: ing.unit,
      active: ing.active,
      category_ids: ing.bean_categories.map((bc) => bc.category_id),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/ingredients/${editingId}`
        : "/api/ingredients";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save ingredient");
      }

      toast.success(editingId ? "Ingredient updated" : "Ingredient created");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save ingredient");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;

    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete ingredient");
      }
      toast.success("Ingredient deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete ingredient");
    }
  };

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent"></div>
            <p className="text-[hsl(25,35%,25%)]">Loading ingredients...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
              Ingredients
            </h1>
            <p className="mt-2 text-[hsl(25,35%,45%)]">
              Manage ingredient inventory. Coffees consume beans (g) and milk
              (ml); adjust stock here. Countable items (e.g. muffins) use unit
              &quot;pcs&quot;.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/manager/ingredients/bulk-import"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Bulk Import
            </Link>
            <Link
              href="/manager/ingredients/audit-log"
              className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Audit Log
            </Link>
            <button
              onClick={openCreateModal}
              className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
            >
              Add Ingredient
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <label htmlFor="search-ingredients" className="sr-only">
            Search by name or supplier
          </label>
          <input
            id="search-ingredients"
            type="text"
            placeholder="Search by name or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-sm text-[hsl(25,35%,25%)] focus:border-[hsl(25,35%,25%)] focus:outline-none"
            aria-label="Search by name or supplier"
          />
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-sm text-[hsl(25,35%,25%)] focus:border-[hsl(25,35%,25%)] focus:outline-none"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Ingredients Table */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-8 text-center">
            <p className="text-[hsl(25,35%,45%)]">No ingredients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[hsl(35,20%,90%)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(35,20%,90%)] bg-[hsl(35,20%,97%)]">
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Price Delta
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[hsl(25,35%,25%)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[hsl(25,35%,25%)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ing) => {
                  const lowStock =
                    ing.stock_quantity <= ing.low_stock_threshold;
                  return (
                    <tr
                      key={ing.id}
                      className="cursor-pointer border-b border-[hsl(35,20%,95%)] transition-colors hover:bg-[hsl(35,20%,97%)]"
                      onClick={() => setViewingIngredient(ing)}
                    >
                      <td className="px-4 py-3 font-medium text-[hsl(25,35%,25%)]">
                        {ing.name}
                      </td>
                      <td
                        className={`px-4 py-3 ${lowStock ? "font-semibold text-red-600" : "text-[hsl(25,35%,45%)]"}`}
                      >
                        {ing.stock_quantity}
                      </td>
                      <td className="px-4 py-3 text-[hsl(25,35%,45%)]">
                        {ing.unit}
                      </td>
                      <td className="px-4 py-3 text-[hsl(25,35%,45%)]">
                        {ing.price_delta_cents > 0
                          ? `+${formatPrice(ing.price_delta_cents)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[hsl(25,35%,45%)]">
                        {ing.supplier || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            ing.active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ing.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStockAdjustingIngredient(ing);
                            setIsStockModalOpen(true);
                          }}
                          className="mr-2 rounded border border-[hsl(25,35%,25%)] bg-[hsl(25,35%,25%)] px-3 py-1 text-xs font-medium text-white hover:bg-[hsl(25,40%,15%)]"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(ing);
                          }}
                          className="mr-2 rounded border border-[hsl(35,20%,90%)] px-3 py-1 text-xs font-medium text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ing.id);
                          }}
                          className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {viewingIngredient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewingIngredient(null)}
        >
          <div
            className="mx-4 w-full max-w-lg rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
                {viewingIngredient.name}
              </h2>
              <button
                onClick={() => setViewingIngredient(null)}
                className="text-[hsl(25,35%,45%)] hover:text-[hsl(25,35%,25%)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {viewingIngredient.description && (
                <div>
                  <div className="font-medium text-[hsl(25,35%,45%)]">
                    Description
                  </div>
                  <div className="text-[hsl(25,35%,25%)]">
                    {viewingIngredient.description}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-[hsl(25,35%,45%)]">
                    Stock
                  </div>
                  <div
                    className={`text-lg font-semibold ${viewingIngredient.stock_quantity <= viewingIngredient.low_stock_threshold ? "text-red-600" : "text-[hsl(25,35%,25%)]"}`}
                  >
                    {viewingIngredient.stock_quantity} {viewingIngredient.unit}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(25,35%,45%)]">
                    Low Stock Threshold
                  </div>
                  <div className="text-[hsl(25,35%,25%)]">
                    {viewingIngredient.low_stock_threshold}{" "}
                    {viewingIngredient.unit}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-[hsl(25,35%,45%)]">
                    Price Delta
                  </div>
                  <div className="text-[hsl(25,35%,25%)]">
                    {viewingIngredient.price_delta_cents > 0
                      ? `+${formatPrice(viewingIngredient.price_delta_cents)}`
                      : "None"}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(25,35%,45%)]">
                    Status
                  </div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${viewingIngredient.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {viewingIngredient.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="space-y-1">
                {viewingIngredient.supplier && (
                  <>
                    <dt className="font-medium text-[hsl(25,35%,45%)]">
                      Supplier
                    </dt>
                    <dd className="text-[hsl(25,35%,25%)]">
                      {viewingIngredient.supplier}
                    </dd>
                  </>
                )}
                {viewingIngredient.bean_categories.length > 0 && (
                  <>
                    <dt className="font-medium text-[hsl(25,35%,45%)]">
                      Categories
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {viewingIngredient.bean_categories.map((bc) => (
                        <span
                          key={bc.category_id}
                          className="rounded-full bg-[hsl(35,20%,93%)] px-2 py-1 text-xs text-[hsl(25,35%,25%)]"
                        >
                          {bc.categories.name}
                        </span>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setViewingIngredient(null);
                  openEditModal(viewingIngredient);
                }}
                className="flex-1 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm text-white hover:bg-[hsl(25,40%,15%)]"
              >
                Edit
              </button>
              <button
                onClick={() => setViewingIngredient(null)}
                className="flex-1 rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-[hsl(25,35%,25%)]">
              {editingId ? "Edit Ingredient" : "Add Ingredient"}
            </h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="ingredient-form-name"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Name *
                </label>
                <input
                  id="ingredient-form-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                  aria-label="Ingredient name"
                />
              </div>
              {/* Description */}
              <div>
                <label
                  htmlFor="ingredient-form-description"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Description
                </label>
                <textarea
                  id="ingredient-form-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                  aria-label="Ingredient description"
                />
              </div>
              {/* Price Delta + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ingredient-form-price-delta"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Price Delta (cents)
                  </label>
                  <input
                    id="ingredient-form-price-delta"
                    type="number"
                    min={0}
                    value={form.price_delta_cents}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price_delta_cents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                    aria-label="Price delta in cents"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ingredient-form-unit"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Unit
                  </label>
                  <select
                    id="ingredient-form-unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                    aria-label="Unit (grams, milliliters, or pieces)"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>
              </div>
              {/* Stock + Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ingredient-form-stock"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Stock Quantity
                  </label>
                  <input
                    id="ingredient-form-stock"
                    type="number"
                    min={0}
                    value={form.stock_quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock_quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                    aria-label="Stock quantity"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ingredient-form-low-stock"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Low Stock Threshold
                  </label>
                  <input
                    id="ingredient-form-low-stock"
                    type="number"
                    min={0}
                    value={form.low_stock_threshold}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        low_stock_threshold: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                    aria-label="Low stock threshold"
                  />
                </div>
              </div>
              {/* Supplier */}
              <div>
                <label
                  htmlFor="ingredient-form-supplier"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Supplier
                </label>
                <input
                  id="ingredient-form-supplier"
                  type="text"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none"
                  aria-label="Supplier"
                />
              </div>
              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={form.active}
                  aria-label="Ingredient active status"
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="active-toggle"
                  className="text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Active
                </label>
              </div>
              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-1 text-sm text-[hsl(25,35%,25%)]"
                      >
                        <input
                          type="checkbox"
                          checked={form.category_ids.includes(cat.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...form.category_ids, cat.id]
                              : form.category_ids.filter((id) => id !== cat.id);
                            setForm({ ...form, category_ids: ids });
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-md border border-[hsl(35,20%,90%)] px-4 py-2 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setStockAdjustingIngredient(null);
        }}
        onSuccess={() => {
          fetchData();
          setIsStockModalOpen(false);
          setStockAdjustingIngredient(null);
        }}
        item={
          stockAdjustingIngredient
            ? {
                id: stockAdjustingIngredient.id,
                name: stockAdjustingIngredient.name,
                stock_quantity: stockAdjustingIngredient.stock_quantity ?? null,
                low_stock_threshold:
                  stockAdjustingIngredient.low_stock_threshold ?? null,
                unit: stockAdjustingIngredient.unit,
              }
            : null
        }
      />
    </div>
  );
}
