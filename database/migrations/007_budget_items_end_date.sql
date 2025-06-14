-- Migration 007: Add end_date column to budget_items table
-- This replaces the is_active boolean with a more flexible end_date system
-- Similar to income_sources end_date implementation

-- Add end_date column to budget_items
ALTER TABLE budget_items 
ADD COLUMN end_date DATE;

-- Add index for performance on end_date queries
CREATE INDEX idx_budget_items_end_date ON budget_items(end_date);

-- Add composite index for user_id and end_date queries
CREATE INDEX idx_budget_items_user_end_date ON budget_items(user_id, end_date);

-- Add partial index for ongoing items (end_date IS NULL)
CREATE INDEX idx_budget_items_ongoing ON budget_items(user_id) 
WHERE end_date IS NULL;

-- Create a computed column view for easier querying
CREATE OR REPLACE VIEW budget_items_with_status AS
SELECT 
  id,
  user_id,
  name,
  category,
  calc_type,
  value,
  cadence,
  depends_on,
  priority,
  end_date,
  created_at,
  updated_at,
  CASE 
    WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN true
    ELSE false
  END as is_active_computed
FROM budget_items;

-- Update existing rows to maintain current active status
-- (Keep existing is_active column for now during transition)
UPDATE budget_items 
SET end_date = NULL 
WHERE is_active = true;

-- Set end_date to yesterday for inactive items
UPDATE budget_items 
SET end_date = CURRENT_DATE - INTERVAL '1 day'
WHERE is_active = false;

-- Add comment explaining the new system
COMMENT ON COLUMN budget_items.end_date IS 'Date when budget item ends. NULL means active/ongoing. Past dates mean inactive.'; 