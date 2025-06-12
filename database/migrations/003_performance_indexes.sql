-- Budget Simple Performance Optimization Indexes
-- Migration: 003_performance_indexes.sql
-- Description: Advanced indexes for optimal query performance based on usage patterns

-- Performance Analysis:
-- 1. User queries will filter by user_id heavily (RLS + user isolation)
-- 2. Date ranges are critical for pay periods and expenses
-- 3. Status filtering is common for active/completed items
-- 4. Category and priority sorting for budget items
-- 5. Complex joins between pay_periods, allocations, and budget_items

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Income Sources: Active income lookup with cadence filtering
CREATE INDEX IF NOT EXISTS idx_income_sources_user_active_cadence 
ON income_sources(user_id, is_active, cadence) 
WHERE is_active = true;

-- Budget Items: Priority ordering for active items by category
CREATE INDEX IF NOT EXISTS idx_budget_items_user_active_priority 
ON budget_items(user_id, is_active, priority) 
WHERE is_active = true;

-- Budget Items: Category and calculation type filtering
CREATE INDEX IF NOT EXISTS idx_budget_items_category_calc_type 
ON budget_items(user_id, category, calc_type) 
WHERE is_active = true;

-- Pay Periods: Date range queries with status
CREATE INDEX IF NOT EXISTS idx_pay_periods_user_dates_status 
ON pay_periods(user_id, start_date DESC, end_date DESC, status);

-- Pay Periods: Current active period lookup
CREATE INDEX IF NOT EXISTS idx_pay_periods_active_current 
ON pay_periods(user_id, status, start_date) 
WHERE status = 'ACTIVE';

-- Allocations: Pay period with status for reconciliation
CREATE INDEX IF NOT EXISTS idx_allocations_period_status_amount 
ON allocations(pay_period_id, status, expected_amount);

-- Expenses: Date range queries with category grouping
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category 
ON expenses(user_id, date DESC, category);

-- Expenses: Monthly/weekly expense summaries
CREATE INDEX IF NOT EXISTS idx_expenses_date_amount 
ON expenses(user_id, date DESC, amount) 
WHERE amount > 0;

-- ========================================
-- GIN INDEXES FOR ARRAY OPERATIONS
-- ========================================

-- Budget Items: Dependency lookup for REMAINING_PERCENT calculations
CREATE INDEX IF NOT EXISTS idx_budget_items_depends_on_gin 
ON budget_items USING GIN(depends_on) 
WHERE depends_on IS NOT NULL;

-- ========================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- ========================================

-- Suggestions: Only pending suggestions need fast access
CREATE INDEX IF NOT EXISTS idx_suggestions_pending 
ON suggestions(pay_period_id, created_at DESC) 
WHERE status = 'PENDING';

-- Allocations: Unpaid allocations for payment tracking
CREATE INDEX IF NOT EXISTS idx_allocations_unpaid 
ON allocations(pay_period_id, budget_item_id, expected_amount) 
WHERE status = 'UNPAID';

-- Expenses: Recent expenses optimization (no date predicate due to immutability)
CREATE INDEX IF NOT EXISTS idx_expenses_recent 
ON expenses(user_id, date DESC, amount);

-- ========================================
-- EXPRESSION INDEXES FOR CALCULATIONS
-- ========================================

-- Budget Items: Total budget amount calculation (fixed items)
CREATE INDEX IF NOT EXISTS idx_budget_items_fixed_value 
ON budget_items(user_id, value) 
WHERE calc_type = 'FIXED' AND is_active = true;

-- Pay Periods: Basic period analysis (removed expression for compatibility)
CREATE INDEX IF NOT EXISTS idx_pay_periods_analysis 
ON pay_periods(user_id, start_date, end_date, expected_net);

-- Expenses: Monthly analysis (removed DATE_TRUNC expression for compatibility)
CREATE INDEX IF NOT EXISTS idx_expenses_monthly_analysis 
ON expenses(user_id, date, amount);

-- ========================================
-- COVERING INDEXES FOR QUERY OPTIMIZATION
-- ========================================

-- Budget Items: Complete item info for allocation calculations
CREATE INDEX IF NOT EXISTS idx_budget_items_allocation_calc 
ON budget_items(user_id, is_active, priority) 
INCLUDE (id, name, category, calc_type, value, cadence, depends_on);

-- Pay Periods: Complete period info for dashboard
CREATE INDEX IF NOT EXISTS idx_pay_periods_dashboard 
ON pay_periods(user_id, status, start_date DESC) 
INCLUDE (id, end_date, income_source_id, expected_net, actual_net);

-- Allocations: Complete allocation info for reconciliation
CREATE INDEX IF NOT EXISTS idx_allocations_reconciliation 
ON allocations(pay_period_id, status) 
INCLUDE (id, budget_item_id, expected_amount, actual_amount);

-- ========================================
-- STATISTICS AND MAINTENANCE
-- ========================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE income_sources;
ANALYZE budget_items;
ANALYZE pay_periods;
ANALYZE allocations;
ANALYZE expenses;
ANALYZE suggestions;

-- ========================================
-- INDEX USAGE MONITORING VIEWS
-- ========================================

-- Create view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    s.schemaname,
    s.relname as tablename,
    s.indexrelname as indexname,
    s.idx_scan as index_scans,
    s.idx_tup_read as tuples_read,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
FROM pg_stat_user_indexes s
WHERE s.schemaname = 'public'
ORDER BY s.idx_scan DESC;

-- Create view to identify unused indexes
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    s.schemaname,
    s.relname as tablename,
    s.indexrelname as indexname,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
FROM pg_stat_user_indexes s
WHERE s.schemaname = 'public' 
AND s.idx_scan = 0
AND s.indexrelname NOT LIKE '%_pkey';

-- ========================================
-- QUERY PERFORMANCE HINTS
-- ========================================

-- Add table comments with optimization hints
COMMENT ON TABLE budget_items IS 'Optimized for: user filtering, priority ordering, dependency lookups. Use depends_on GIN index for array operations.';
COMMENT ON TABLE pay_periods IS 'Optimized for: date range queries, status filtering, current period lookup.';
COMMENT ON TABLE allocations IS 'Optimized for: pay period reconciliation, status filtering, budget item joins.';
COMMENT ON TABLE expenses IS 'Optimized for: date range queries, category analysis, recent expense tracking.';

-- Add index usage recommendations
COMMENT ON INDEX idx_budget_items_depends_on_gin IS 'Use for dependency calculations: WHERE budget_item_id = ANY(depends_on)';
COMMENT ON INDEX idx_pay_periods_active_current IS 'Use for current pay period: WHERE status = ACTIVE AND start_date <= current_timestamp';
COMMENT ON INDEX idx_expenses_recent IS 'Use for recent analytics: Optimized for date DESC ordering, filter dates in application'; 