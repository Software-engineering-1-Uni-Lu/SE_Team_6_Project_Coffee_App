-- Allow admins and staff to create orders for any customer (including walk-ins)
CREATE POLICY "Admins and staff can create orders"
  ON orders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Add stock quantity to items for inventory management
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

-- Optional: index for active items with stock
CREATE INDEX IF NOT EXISTS idx_items_stock ON items(stock_quantity);

