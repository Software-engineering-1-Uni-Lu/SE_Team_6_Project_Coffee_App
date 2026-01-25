/**
 * POST /api/manager/ingredients/bulk-import
 *
 * PURPOSE:
 * Bulk import stock updates from CSV file.
 * Only managers and admins can import stock updates.
 * Part of CSA-214: Modify In-Stock Quantity
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const STOCK_ADJUSTMENT_REASONS = [
  "Restock",
  "Waste",
  "Correction",
  "Manual Adjustment",
] as const;

type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CSVRow {
  ingredient_id: string;
  new_quantity: string;
  reason: string;
  note?: string;
}

interface ValidationError {
  row: number;
  ingredient_id: string;
  error: string;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  // Check if first line is header
  const hasHeader =
    lines[0].toLowerCase().includes("ingredient_id") ||
    lines[0].toLowerCase().includes("item_id");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: CSVRow[] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue; // Skip empty lines

    // Simple CSV parsing (handles quoted fields)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    // Add last field
    values.push(current.trim());

    // Map to CSVRow (flexible column mapping)
    const row: CSVRow = {
      ingredient_id: "",
      new_quantity: "",
      reason: "",
      note: "",
    };

    // Try to map columns by name if header exists, otherwise by position
    if (hasHeader && lines[0]) {
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      values.forEach((value, index) => {
        const header = headers[index];
        if (header?.includes("ingredient_id") || header?.includes("item_id")) {
          row.ingredient_id = value.replace(/"/g, "");
        } else if (
          header?.includes("quantity") ||
          header?.includes("new_quantity")
        ) {
          row.new_quantity = value.replace(/"/g, "");
        } else if (header?.includes("reason")) {
          row.reason = value.replace(/"/g, "");
        } else if (header?.includes("note")) {
          row.note = value.replace(/"/g, "");
        }
      });
    } else {
      // Position-based mapping: ingredient_id, new_quantity, reason, note
      row.ingredient_id = values[0]?.replace(/"/g, "") || "";
      row.new_quantity = values[1]?.replace(/"/g, "") || "";
      row.reason = values[2]?.replace(/"/g, "") || "";
      row.note = values[3]?.replace(/"/g, "") || "";
    }

    // Always add row, even if incomplete - validation will catch missing fields
    // Only skip completely empty rows
    if (row.ingredient_id || row.new_quantity || row.reason) {
      rows.push(row);
    }
  }

  return rows;
}

async function validateRow(
  row: CSVRow,
  rowNumber: number,
  supabase: any
): Promise<ValidationError | null> {
  // Validate ingredient_id exists
  if (!row.ingredient_id) {
    return {
      row: rowNumber,
      ingredient_id: "",
      error: "Missing ingredient_id",
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", row.ingredient_id)
    .single();

  if (itemError || !item) {
    return {
      row: rowNumber,
      ingredient_id: row.ingredient_id,
      error: "Ingredient not found",
    };
  }

  // Validate quantity
  const quantity = Number(row.new_quantity);
  if (isNaN(quantity) || quantity < 0) {
    return {
      row: rowNumber,
      ingredient_id: row.ingredient_id,
      error: "Invalid quantity: must be a non-negative number",
    };
  }

  // Validate reason
  if (!row.reason) {
    return {
      row: rowNumber,
      ingredient_id: row.ingredient_id,
      error: "Missing reason",
    };
  }

  if (!STOCK_ADJUSTMENT_REASONS.includes(row.reason as StockAdjustmentReason)) {
    return {
      row: rowNumber,
      ingredient_id: row.ingredient_id,
      error: `Invalid reason. Must be one of: ${STOCK_ADJUSTMENT_REASONS.join(", ")}`,
    };
  }

  // Validate note length if provided
  if (row.note && row.note.length > 500) {
    return {
      row: rowNumber,
      ingredient_id: row.ingredient_id,
      error: "Note must be 500 characters or less",
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, "", options);
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = roleError || !roleData ? "customer" : roleData.role;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Only managers and admins can import stock updates" },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = (formData.get("mode") as string) || "all-or-nothing";

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json(
        { error: "File must be a CSV file" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Read file content
    const fileText = await file.text();

    // Parse CSV
    const rows = parseCSV(fileText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or invalid" },
        { status: 400 }
      );
    }

    // Validate all rows
    const errors: ValidationError[] = [];
    const validRows: CSVRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header
      const error = await validateRow(row, rowNumber, supabase);

      if (error) {
        errors.push(error);
      } else {
        validRows.push(row);
      }
    }

    // If all-or-nothing mode and there are errors, return without updating
    if (mode === "all-or-nothing" && errors.length > 0) {
      return NextResponse.json(
        {
          success: 0,
          failed: rows.length,
          errors,
          message: "All rows failed validation. No updates applied.",
        },
        { status: 400 }
      );
    }

    // Process valid rows
    let successCount = 0;
    const processingErrors: ValidationError[] = [];

    for (const row of validRows) {
      try {
        // Get current stock
        const { data: currentItem } = await supabase
          .from("items")
          .select("stock_quantity")
          .eq("id", row.ingredient_id)
          .single();

        const oldQuantity = currentItem?.stock_quantity || 0;
        const newQuantity = Number(row.new_quantity);

        // Update stock
        const { error: updateError } = await supabase
          .from("items")
          .update({
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.ingredient_id);

        if (updateError) {
          processingErrors.push({
            row: rows.indexOf(row) + 2,
            ingredient_id: row.ingredient_id,
            error: updateError.message,
          });
          continue;
        }

        // Create audit log entry
        await supabase.from("stock_audit_log").insert({
          item_id: row.ingredient_id,
          user_id: user.id,
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          reason: row.reason as StockAdjustmentReason,
          note: row.note || null,
        });

        successCount++;
      } catch (error: any) {
        processingErrors.push({
          row: rows.indexOf(row) + 2,
          ingredient_id: row.ingredient_id,
          error: error?.message || "Unknown error processing row",
        });
      }
    }

    return NextResponse.json(
      {
        success: successCount,
        failed: errors.length + processingErrors.length,
        errors: [...errors, ...processingErrors],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error in bulk import:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
