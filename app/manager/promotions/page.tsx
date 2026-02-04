/**
 * Purpose: Manager/Admin promotions page.
 * List, create, edit, and delete promotions. Target: Global, Category (group), or Single item (mutually exclusive).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/src/integrations/supabase/client";
import type { Promotion } from "@/src/types/promotions";
import type { Category } from "@/src/types/menu";
import type { MenuItem } from "@/src/types/menu";
import { formatPrice } from "@/src/lib/cart-utils";
import { toast } from "sonner";

type TargetType = "global" | "category" | "item";

const emptyPromo = (): Partial<Promotion> => ({
  name: "",
  description: null,
  discount_type: "percent",
  value_cents: 0,
  percent: 0,
  active: true,
  start_at: null,
  end_at: null,
  category_id: null,
  item_id: null,
});

function getTargetType(p: Promotion): TargetType {
  if (p.item_id) return "item";
  if (p.category_id) return "category";
  return "global";
}

function formatDiscount(p: Promotion): string {
  if (p.discount_type === "percent") return `${p.percent}% off`;
  return `${formatPrice(p.value_cents)} off`;
}

function formatTarget(
  p: Promotion,
  categories: Category[],
  items: MenuItem[]
): string {
  if (p.item_id) {
    const item = items.find((i) => i.id === p.item_id);
    return item ? `Item: ${item.name}` : `Item: ${p.item_id}`;
  }
  if (p.category_id) {
    const cat = categories.find((c) => c.id === p.category_id);
    return cat ? `Category: ${cat.name}` : `Category: ${p.category_id}`;
  }
  return "All items (global)";
}

function formatOptionalDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return s;
  }
}

export default function ManagerPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Partial<Promotion>>(emptyPromo());
  const [targetType, setTargetType] = useState<TargetType>("global");
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [targetItemId, setTargetItemId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchPromotions = useCallback(async () => {
    const res = await fetch("/api/promotions");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to load promotions");
    }
    const data = await res.json();
    setPromotions(data.promotions || []);
  }, []);

  const fetchCategoriesAndItems = useCallback(async () => {
    const supabase = createClient();
    const [catRes, itemsRes] = await Promise.all([
      supabase.from("categories").select("*").order("position"),
      supabase.from("items").select("id, name, category_id").order("name"),
    ]);
    if (catRes.error) throw catRes.error;
    if (itemsRes.error) throw itemsRes.error;
    setCategories(catRes.data || []);
    setItems((itemsRes.data as MenuItem[]) || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchPromotions(), fetchCategoriesAndItems()]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          toast.error("Failed to load promotions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchPromotions, fetchCategoriesAndItems]);

  const openCreate = () => {
    setEditingPromo(null);
    setForm(emptyPromo());
    setTargetType("global");
    setTargetCategoryId("");
    setTargetItemId("");
    setIsModalOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setForm({
      name: p.name,
      description: p.description ?? null,
      discount_type: p.discount_type,
      value_cents: p.value_cents,
      percent: p.percent,
      active: p.active,
      start_at: p.start_at ?? null,
      end_at: p.end_at ?? null,
      category_id: p.category_id ?? null,
      item_id: p.item_id ?? null,
    });
    setTargetType(getTargetType(p));
    setTargetCategoryId(p.category_id ?? "");
    setTargetItemId(p.item_id ?? "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPromo(null);
    setForm(emptyPromo());
    setTargetType("global");
    setTargetCategoryId("");
    setTargetItemId("");
  };

  const getPayload = () => {
    let category_id: string | null = null;
    let item_id: string | null = null;
    if (targetType === "category" && targetCategoryId)
      category_id = targetCategoryId;
    if (targetType === "item" && targetItemId) item_id = targetItemId;

    const percent =
      form.discount_type === "percent" ? (Number(form.percent) ?? 0) : 0;
    const value_cents =
      form.discount_type === "amount"
        ? Math.max(0, Number(form.value_cents) ?? 0)
        : 0;

    return {
      name: (form.name ?? "").trim(),
      description:
        form.description == null || form.description === ""
          ? null
          : String(form.description).trim(),
      discount_type: form.discount_type ?? "percent",
      value_cents,
      percent,
      active: form.active !== false,
      start_at:
        form.start_at && String(form.start_at).trim() ? form.start_at : null,
      end_at: form.end_at && String(form.end_at).trim() ? form.end_at : null,
      category_id,
      item_id,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(form.name ?? "").trim()) {
      toast.error("Name is required");
      return;
    }
    if (targetType === "category" && !targetCategoryId) {
      toast.error("Select a category");
      return;
    }
    if (targetType === "item" && !targetItemId) {
      toast.error("Select an item");
      return;
    }
    const payload = getPayload();

    setSaving(true);
    try {
      if (editingPromo) {
        const res = await fetch(`/api/promotions/${editingPromo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update promotion");
        }
        toast.success("Promotion updated");
      } else {
        const res = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create promotion");
        }
        toast.success("Promotion created");
      }
      await fetchPromotions();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Promotion deleted");
      await fetchPromotions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[hsl(25,35%,25%)] border-r-transparent" />
            <p className="text-[hsl(25,35%,25%)]">Loading promotions...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
              Promotions
            </h1>
            <p className="mt-2 text-[hsl(25,35%,45%)]">
              Create and assign promotions to all items (global), a category
              (group), or a single menu item. Discounts apply on the{" "}
              <Link
                href="/menu"
                className="font-medium text-[hsl(25,35%,25%)] underline hover:no-underline"
              >
                Menu
              </Link>{" "}
              and at checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)]"
          >
            Add promotion
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {promotions.length === 0 ? (
          <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-8 text-center">
            <p className="text-[hsl(25,35%,45%)]">No promotions yet.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(25,40%,15%)]"
            >
              Add promotion
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[hsl(35,20%,90%)] bg-white shadow-sm">
            <table className="min-w-full divide-y divide-[hsl(35,20%,90%)]">
              <thead className="bg-[hsl(35,20%,97%)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Start
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    End
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[hsl(25,35%,45%)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(35,20%,90%)] bg-white">
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-sm font-medium text-[hsl(25,35%,25%)]">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                      {formatTarget(p, categories, items)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(25,35%,25%)]">
                      {formatDiscount(p)}
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                      {formatOptionalDate(p.start_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(25,35%,45%)]">
                      {formatOptionalDate(p.end_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="mr-2 rounded border border-[hsl(35,20%,90%)] bg-white px-2 py-1 text-sm text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="rounded border border-red-200 bg-white px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create/Edit modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="border-b border-[hsl(35,20%,90%)] px-6 py-4">
              <h2
                id="promotion-modal-title"
                className="text-xl font-semibold text-[hsl(25,35%,25%)]"
              >
                {editingPromo ? "Edit promotion" : "Add promotion"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
              <div>
                <label
                  htmlFor="promo-name"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Name *
                </label>
                <input
                  id="promo-name"
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="promo-desc"
                  className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                >
                  Description (optional)
                </label>
                <textarea
                  id="promo-desc"
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value || null,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="promo-type"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Discount type
                  </label>
                  <select
                    id="promo-type"
                    value={form.discount_type ?? "percent"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_type: e.target.value as "percent" | "amount",
                      }))
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                  >
                    <option value="percent">Percent off</option>
                    <option value="amount">Amount off (€)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="promo-value"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    {form.discount_type === "amount"
                      ? "Amount (cents)"
                      : "Percent"}
                  </label>
                  <input
                    id="promo-value"
                    type="number"
                    min={0}
                    max={form.discount_type === "percent" ? 100 : undefined}
                    value={
                      form.discount_type === "amount"
                        ? (form.value_cents ?? 0)
                        : (form.percent ?? 0)
                    }
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (form.discount_type === "amount") {
                        setForm((f) => ({ ...f, value_cents: v }));
                      } else {
                        setForm((f) => ({ ...f, percent: v }));
                      }
                    }}
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                  />
                  {form.discount_type === "amount" && (
                    <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                      e.g. 150 = €1.50 off
                    </p>
                  )}
                </div>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]">
                  Target (choose one)
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target"
                      checked={targetType === "global"}
                      onChange={() => {
                        setTargetType("global");
                        setTargetCategoryId("");
                        setTargetItemId("");
                      }}
                    />
                    <span>All items (global)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target"
                      checked={targetType === "category"}
                      onChange={() => {
                        setTargetType("category");
                        setTargetItemId("");
                      }}
                    />
                    <span>Target category</span>
                    {targetType === "category" && (
                      <select
                        value={targetCategoryId}
                        onChange={(e) => setTargetCategoryId(e.target.value)}
                        className="ml-2 rounded border border-[hsl(35,20%,90%)] px-2 py-1 text-sm"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target"
                      checked={targetType === "item"}
                      onChange={() => {
                        setTargetType("item");
                        setTargetCategoryId("");
                      }}
                    />
                    <span>Target item</span>
                    {targetType === "item" && (
                      <select
                        value={targetItemId}
                        onChange={(e) => setTargetItemId(e.target.value)}
                        className="ml-2 rounded border border-[hsl(35,20%,90%)] px-2 py-1 text-sm"
                      >
                        <option value="">Select item</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="promo-start"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    Start (optional)
                  </label>
                  <input
                    id="promo-start"
                    type="datetime-local"
                    value={
                      form.start_at
                        ? new Date(form.start_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        start_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      }))
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="promo-end"
                    className="mb-1 block text-sm font-medium text-[hsl(25,35%,25%)]"
                  >
                    End (optional)
                  </label>
                  <input
                    id="promo-end"
                    type="datetime-local"
                    value={
                      form.end_at
                        ? new Date(form.end_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        end_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      }))
                    }
                    className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="promo-active"
                  type="checkbox"
                  checked={form.active !== false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                <label
                  htmlFor="promo-active"
                  className="text-sm text-[hsl(25,35%,25%)]"
                >
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-[hsl(35,20%,90%)] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] hover:bg-[hsl(35,20%,95%)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(25,40%,15%)] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingPromo ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
