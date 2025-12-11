-- Add inventory threshold fields to items table
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS auto_reorder_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN public.items.low_stock_threshold IS 'Quantity threshold to trigger low stock alert';
COMMENT ON COLUMN public.items.reorder_quantity IS 'Suggested quantity to reorder when stock is low';
COMMENT ON COLUMN public.items.auto_reorder_enabled IS 'Enable automatic reorder suggestions for this item';
COMMENT ON COLUMN public.items.track_inventory IS 'Whether to track inventory for this item (false for prepared drinks, true for raw materials/retail)';

-- Create view for low stock items
CREATE OR REPLACE VIEW public.low_stock_items AS
SELECT 
  i.id,
  i.name,
  i.slug,
  i.category_id,
  i.stock_quantity,
  i.low_stock_threshold,
  i.reorder_quantity,
  i.auto_reorder_enabled,
  i.active,
  c.name as category_name,
  CASE 
    WHEN i.stock_quantity <= 0 THEN 'out_of_stock'
    WHEN i.stock_quantity <= (i.low_stock_threshold * 0.5) THEN 'critical'
    WHEN i.stock_quantity <= i.low_stock_threshold THEN 'low'
    ELSE 'normal'
  END as stock_status,
  i.reorder_quantity - COALESCE(i.stock_quantity, 0) as suggested_order_quantity
FROM public.items i
LEFT JOIN public.categories c ON c.id = i.category_id
WHERE i.active = TRUE
  AND i.track_inventory = TRUE
  AND COALESCE(i.stock_quantity, 0) <= i.low_stock_threshold
ORDER BY 
  CASE 
    WHEN i.stock_quantity <= 0 THEN 1
    WHEN i.stock_quantity <= (i.low_stock_threshold * 0.5) THEN 2
    WHEN i.stock_quantity <= i.low_stock_threshold THEN 3
    ELSE 4
  END,
  i.stock_quantity ASC;

-- Create function to calculate reorder suggestions based on sales data
CREATE OR REPLACE FUNCTION calculate_reorder_suggestions(days_lookback INTEGER DEFAULT 7)
RETURNS TABLE (
  item_id TEXT,
  item_name TEXT,
  current_stock INTEGER,
  avg_daily_sales NUMERIC,
  days_until_stockout NUMERIC,
  suggested_reorder_qty INTEGER,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH sales_data AS (
    SELECT 
      items->>'id' as item_id,
      items->>'name' as item_name,
      COUNT(*) as total_orders
    FROM public.orders o,
    jsonb_array_elements(o.items::jsonb) as items
    WHERE o.created_at >= NOW() - (days_lookback || ' days')::INTERVAL
      AND o.status IN ('pending', 'ready', 'completed')
    GROUP BY items->>'id', items->>'name'
  ),
  item_stats AS (
    SELECT 
      sd.item_id,
      sd.item_name,
      COALESCE(i.stock_quantity, 0) as current_stock,
      i.low_stock_threshold,
      i.reorder_quantity,
      COALESCE(sd.total_orders::NUMERIC / days_lookback, 0) as avg_daily_sales
    FROM sales_data sd
    JOIN public.items i ON i.id = sd.item_id::uuid
    WHERE i.active = TRUE
      AND i.track_inventory = TRUE
  )
  SELECT 
    is_table.item_id::TEXT,
    is_table.item_name,
    is_table.current_stock,
    is_table.avg_daily_sales,
    CASE 
      WHEN is_table.avg_daily_sales > 0 THEN (is_table.current_stock / is_table.avg_daily_sales)
      ELSE NULL
    END as days_until_stockout,
    GREATEST(
      is_table.reorder_quantity,
      CEIL(is_table.avg_daily_sales * 7)::INTEGER
    ) as suggested_reorder_qty,
    CASE 
      WHEN is_table.current_stock <= 0 THEN 'critical'
      WHEN is_table.current_stock <= (is_table.low_stock_threshold * 0.5) THEN 'high'
      WHEN is_table.current_stock <= is_table.low_stock_threshold THEN 'medium'
      WHEN (is_table.current_stock / NULLIF(is_table.avg_daily_sales, 0)) < 3 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM item_stats is_table
  WHERE is_table.current_stock <= is_table.low_stock_threshold
    OR (is_table.avg_daily_sales > 0 AND (is_table.current_stock / is_table.avg_daily_sales) < 3)
  ORDER BY 
    CASE 
      WHEN is_table.current_stock <= 0 THEN 1
      WHEN is_table.current_stock <= (is_table.low_stock_threshold * 0.5) THEN 2
      WHEN is_table.current_stock <= is_table.low_stock_threshold THEN 3
      ELSE 4
    END,
    is_table.avg_daily_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON public.low_stock_items TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reorder_suggestions TO authenticated;

