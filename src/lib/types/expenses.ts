import type {
  Expense,
  Database,
  ExpenseType,
  PayPeriod,
  BudgetItem,
} from "@/types/database";

// Re-export database types
export type { Expense, ExpenseType };

// Database operation types
export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
export type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];

// Enhanced expense with related data
export interface ExpenseWithDetails extends Expense {
  pay_period?: PayPeriod | null;
  budget_item?: BudgetItem | null;
}

// Expense creation data
export interface ExpenseCreateData {
  description: string;
  amount: number;
  date: string;
  category: string;
  pay_period_id?: string | null;
  budget_item_id?: string | null;
  type?: ExpenseType;
}

// Expense update data
export interface ExpenseUpdateData {
  description?: string;
  amount?: number;
  date?: string;
  category?: string;
  pay_period_id?: string | null;
  budget_item_id?: string | null;
  type?: ExpenseType;
}

// Expense filtering options
export interface ExpenseFilters {
  start_date?: string;
  end_date?: string;
  category?: string;
  min_amount?: number;
  max_amount?: number;
  type?: ExpenseType;
  pay_period_id?: string;
  budget_item_id?: string;
  search?: string; // Search in description
}

// Expense summary data
export interface ExpenseSummary {
  total_expenses: number;
  total_budget_payments: number;
  total_amount: number;
  expense_count: number;
  categories: ExpenseCategorySummary[];
  monthly_totals: MonthlyExpenseSummary[];
}

// Category summary
export interface ExpenseCategorySummary {
  category: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

// Monthly summary
export interface MonthlyExpenseSummary {
  month: string; // YYYY-MM format
  total_amount: number;
  expense_count: number;
  budget_payments: number;
  general_expenses: number;
}

// Expense validation result
export interface ExpenseValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  is_duplicate?: boolean;
  duplicate_expense_id?: string;
}

// Expense analytics data
export interface ExpenseAnalytics {
  spending_trends: SpendingTrend[];
  category_breakdown: CategoryBreakdown[];
  budget_vs_actual: BudgetVsActual[];
  monthly_comparison: MonthlyComparison[];
}

export interface SpendingTrend {
  date: string;
  amount: number;
  category: string;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  budget_allocated?: number;
  variance?: number;
}

export interface BudgetVsActual {
  budget_item_name: string;
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
}

export interface MonthlyComparison {
  month: string;
  current_amount: number;
  previous_amount: number;
  change_amount: number;
  change_percentage: number;
}

// Duplicate detection options
export interface DuplicateDetectionOptions {
  amount_tolerance?: number; // Default: 0 (exact match)
  date_tolerance_days?: number; // Default: 0 (same day)
  description_similarity?: number; // Default: 0.8 (80% similarity)
  check_category?: boolean; // Default: true
}

// Batch expense operations
export interface ExpenseBatchCreate {
  expenses: ExpenseCreateData[];
  user_id: string;
}

export interface ExpenseBatchUpdate {
  updates: Array<{
    id: string;
    data: ExpenseUpdateData;
  }>;
}

export interface ExpenseBatchDelete {
  expense_ids: string[];
  user_id: string;
}

// Expense import data
export interface ExpenseImportData {
  description: string;
  amount: number;
  date: string;
  category?: string;
  raw_data?: Record<string, unknown>;
}

export interface ExpenseImportResult {
  success_count: number;
  error_count: number;
  duplicate_count: number;
  created_expenses: Expense[];
  errors: Array<{
    row: number;
    error: string;
    data: ExpenseImportData;
  }>;
}
