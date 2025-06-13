import { Database } from "@/types/database";
import type { BudgetItem, IncomeSource } from "@/types/database";

// Re-export database types for convenience
export type Allocation = Database["public"]["Tables"]["allocations"]["Row"];
export type AllocationInsert =
  Database["public"]["Tables"]["allocations"]["Insert"];
export type AllocationUpdate =
  Database["public"]["Tables"]["allocations"]["Update"];
export type AllocationStatus = Database["public"]["Enums"]["allocation_status"];

// Extended allocation with related data
export interface AllocationWithDetails extends Allocation {
  budget_item?: {
    id: string;
    name: string;
    category: Database["public"]["Enums"]["budget_category"];
    calc_type: Database["public"]["Enums"]["calc_type"];
    value: number;
    priority: number;
  };
  pay_period?: {
    id: string;
    start_date: string;
    end_date: string;
    expected_net: number;
  };
}

// Allocation calculation result
export interface AllocationCalculationResult {
  budget_item_id: string;
  expected_amount: number;
  calculation_details: {
    base_amount: number;
    calculation_type: Database["public"]["Enums"]["calc_type"];
    percentage?: number;
    dependency_total?: number;
    pro_rated_factor?: number;
    notes?: string;
  };
}

// Batch allocation calculation request
export interface AllocationCalculationRequest {
  pay_period_id: string;
  budget_items: BudgetItem[];
  income_source: IncomeSource;
  pro_rate_factor?: number; // For partial pay periods
}

// Allocation calculation response
export interface AllocationCalculationResponse {
  success: boolean;
  pay_period_id: string;
  allocations: AllocationCalculationResult[];
  summary: {
    total_allocated: number;
    total_remaining: number;
    items_processed: number;
    calculation_errors: string[];
  };
  calculation_order: string[]; // Order items were calculated in
  timestamp: string;
}

// Allocation engine configuration
export interface AllocationEngineConfig {
  enable_pro_rating: boolean;
  handle_rounding: "up" | "down" | "nearest";
  max_iterations: number; // For circular dependency resolution
  precision_decimals: number;
}

// Allocation batch operations
export interface AllocationBatchCreate {
  pay_period_id: string;
  allocations: Array<{
    budget_item_id: string;
    expected_amount: number;
    status?: AllocationStatus;
  }>;
}

export interface AllocationBatchUpdate {
  updates: Array<{
    id: string;
    actual_amount?: number;
    status?: AllocationStatus;
  }>;
}

// Allocation summary for reporting
export interface AllocationSummary {
  pay_period_id: string;
  total_expected: number;
  total_actual: number;
  total_remaining: number;
  paid_count: number;
  unpaid_count: number;
  categories: Record<
    string,
    {
      expected: number;
      actual: number;
      count: number;
    }
  >;
}

// Allocation validation result
export interface AllocationValidationResult {
  is_valid: boolean;
  errors: Array<{
    type:
      | "amount_mismatch"
      | "negative_amount"
      | "missing_data"
      | "dependency_error";
    message: string;
    budget_item_id?: string;
    suggested_fix?: string;
  }>;
  warnings: Array<{
    type: "rounding_adjustment" | "pro_rating_applied" | "dependency_order";
    message: string;
    budget_item_id?: string;
  }>;
}

// Edge function request/response types
export interface AllocationEngineRequest {
  user_id: string;
  pay_period_id: string;
  config?: Partial<AllocationEngineConfig>;
  force_recalculate?: boolean;
}

export interface AllocationEngineResponse {
  success: boolean;
  data?: AllocationCalculationResponse;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
