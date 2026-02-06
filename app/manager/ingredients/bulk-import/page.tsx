/**
 * Purpose: Bulk CSV import page for stock updates.
 * Part of CSA-214: Modify In-Stock Quantity
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ValidationError {
  row: number;
  ingredient_id: string;
  error: string;
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"all-or-nothing" | "partial">(
    "all-or-nothing"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: ValidationError[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const response = await fetch("/api/manager/ingredients/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import stock updates");
      }

      setResult(data);

      if (data.success > 0) {
        toast.success(
          `Successfully updated ${data.success} ingredient${data.success !== 1 ? "s" : ""}`
        );
      }

      if (data.failed > 0) {
        toast.warning(
          `${data.failed} row${data.failed !== 1 ? "s" : ""} failed validation`
        );
      }
    } catch (error: any) {
      console.error("Error importing stock:", error);
      toast.error(error.message || "Failed to import stock updates");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a simple CSV template
    const template = `ingredient_id,new_quantity,reason,note
example-item-id-1,100,Restock,Weekly delivery
example-item-id-2,50,Waste,Spoiled inventory`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[hsl(25,35%,25%)]">
          Bulk Stock Import
        </h1>
        <p className="mt-2 text-[hsl(25,35%,45%)]">
          Import stock updates from a CSV file
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Upload Form */}
        <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
            Upload CSV File
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="file"
                className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                CSV File *
              </label>
              <input
                type="file"
                id="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-sm focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                required
                disabled={loading}
              />
              {file && (
                <p className="mt-1 text-sm text-[hsl(25,35%,45%)]">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="mode"
                className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
              >
                Processing Mode
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "all-or-nothing" | "partial")
                }
                className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 focus:border-[hsl(25,35%,25%)] focus:outline-none focus:ring-1 focus:ring-[hsl(25,35%,25%)]"
                disabled={loading}
              >
                <option value="all-or-nothing">
                  All-or-Nothing (Rollback on any error)
                </option>
                <option value="partial">
                  Partial (Process valid rows only)
                </option>
              </select>
              <p className="mt-1 text-xs text-[hsl(25,35%,45%)]">
                {mode === "all-or-nothing"
                  ? "All rows must be valid. If any row fails, no updates are applied."
                  : "Valid rows will be processed. Invalid rows will be reported."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-md bg-[hsl(25,35%,25%)] px-4 py-2 font-medium text-white transition-colors hover:bg-[hsl(25,40%,15%)] disabled:opacity-50"
                disabled={loading || !file}
              >
                {loading ? "Importing..." : "Import Stock Updates"}
              </button>
            </div>
          </form>
        </div>

        {/* Instructions & Template */}
        <div className="space-y-6">
          <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
              CSV Format
            </h2>
            <div className="space-y-2 text-sm text-[hsl(25,35%,45%)]">
              <p>
                <strong>Required columns:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <code>ingredient_id</code> - UUID of the ingredient/item
                </li>
                <li>
                  <code>new_quantity</code> - New stock quantity (number, ≥ 0)
                </li>
                <li>
                  <code>reason</code> - One of: Restock, Waste, Correction,
                  Manual Adjustment
                </li>
              </ul>
              <p className="mt-3">
                <strong>Optional columns:</strong>
              </p>
              <ul className="ml-4 list-disc">
                <li>
                  <code>note</code> - Optional note (max 500 characters)
                </li>
              </ul>
            </div>
            <button
              onClick={downloadTemplate}
              className="mt-4 rounded-md border border-[hsl(35,20%,90%)] bg-white px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)]"
            >
              Download Template
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-lg border border-[hsl(35,20%,90%)] bg-white p-6">
              <h2 className="mb-4 text-xl font-semibold text-[hsl(25,35%,25%)]">
                Import Results
              </h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-green-600">
                    ✓ {result.success} successful
                  </span>
                </p>
                <p>
                  <span className="font-medium text-red-600">
                    ✗ {result.failed} failed
                  </span>
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium text-[hsl(25,35%,25%)]">
                      Errors:
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-[hsl(35,20%,90%)] p-2">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600">
                          Row {error.row}: {error.error}
                          {error.ingredient_id && (
                            <span className="text-[hsl(25,35%,45%)]">
                              {" "}
                              (ID: {error.ingredient_id.slice(0, 8)}...)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
