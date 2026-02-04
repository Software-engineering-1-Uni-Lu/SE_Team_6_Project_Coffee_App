/**
 * Purpose: Type definitions for promotions.
 * Matches public.promotions table and discount_type enum.
 */

export type DiscountType = "percent" | "amount";

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  value_cents: number;
  percent: number;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  category_id: string | null;
  item_id: string | null;
  created_at: string;
  updated_at: string;
}
