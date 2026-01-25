/**
 * Purpose: Modal for adjusting stock quantity with reason tracking.
 * Part of CSA-214: Modify In-Stock Quantity
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

const STOCK_ADJUSTMENT_REASONS = [
  "Restock",
  "Waste",
  "Correction",
  "Manual Adjustment",
] as const;

type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item: {
    id: string;
    name: string;
    stock_quantity: number | null;
    low_stock_threshold: number | null;
  } | null;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: StockAdjustmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    new_quantity: "",
    reason: "" as StockAdjustmentReason | "",
    note: "",
  });

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        new_quantity: item.stock_quantity?.toString() || "0",
        reason: "",
        note: "",
      });
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) return;

    // Validation
    if (!formData.reason) {
      toast.error("Please select a reason for the stock adjustment");
      return;
    }

    const newQuantity = Number(formData.new_quantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error("Quantity must be a non-negative number");
      return;
    }

    if (formData.note && formData.note.length > 500) {
      toast.error("Note must be 500 characters or less");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/manager/ingredients/${item.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_quantity: newQuantity,
            reason: formData.reason,
            note: formData.note || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update stock");
      }

      toast.success("Stock updated successfully");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error updating stock:", error);
      toast.error(error.message || "Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const currentStock = item.stock_quantity ?? 0;
  const isLowStock =
    item.low_stock_threshold !== null &&
    currentStock <= item.low_stock_threshold;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[hsl(25,35%,25%)]">
            Adjust Stock
          </h2>
          <button
            onClick={onClose}
            className="text-[hsl(25,35%,45%)] hover:text-[hsl(25,35%,25%)]"
            disabled={loading}
            aria-label="Close modal"
            title="Close"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-[hsl(25,35%,25%)]">
            Item: <span className="font-normal">{item.name}</span>
          </p>
          <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
            Current Stock:{" "}
            <span
              className={`font-medium ${
                isLowStock ? "text-red-600" : "text-[hsl(25,35%,25%)]"
              }`}
            >
              {currentStock}
            </span>
            {item.low_stock_threshold !== null && (
              <span className="text-[hsl(25,35%,45%)]">
                {" "}
                (Threshold: {item.low_stock_threshold})
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="new_quantity"
              className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              New Quantity *
            </label>
            <input
              type="number"
              id="new_quantity"
              min="0"
              step="1"
              value={formData.new_quantity}
              onChange={(e) =>
                setFormData({ ...formData, new_quantity: e.target.value })
              }
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="reason"
              className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Reason *{" "}
              <span className="text-xs text-[hsl(25,35%,45%)]">(Required)</span>
            </label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reason: e.target.value as StockAdjustmentReason,
                })
              }
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
              required
              disabled={loading}
            >
              <option value="">Select a reason...</option>
              {STOCK_ADJUSTMENT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="note"
              className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
            >
              Note{" "}
              <span className="text-xs text-[hsl(25,35%,45%)]">(Optional)</span>
            </label>
            <textarea
              id="note"
              rows={3}
              maxLength={500}
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
              placeholder="Add a note explaining this adjustment..."
              disabled={loading}
            />
            <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
              {formData.note.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
