/**
 * Purpose: Type definitions for menu-related entities.
 * Defines interfaces for items, categories, and modifiers.
 */

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
  active: boolean;
  modifiers: Modifier[];
  availability_start: string | null;
  availability_end: string | null;
  available_days: string[] | null;
  is_available_now?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Modifier {
  name: string;
  options: ModifierOption[];
}

export interface ModifierOption {
  label: string;
  price: number;
}
