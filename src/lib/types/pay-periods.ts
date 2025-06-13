import { Database } from "@/types/database";

// Re-export database types for convenience
export type PayPeriod = Database["public"]["Tables"]["pay_periods"]["Row"];
export type PayPeriodInsert =
  Database["public"]["Tables"]["pay_periods"]["Insert"];
export type PayPeriodUpdate =
  Database["public"]["Tables"]["pay_periods"]["Update"];
export type PayPeriodStatus = Database["public"]["Enums"]["pay_period_status"];
export type IncomeCadence = Database["public"]["Enums"]["income_cadence"];

// Extended types for the frontend
export interface PayPeriodWithDetails extends PayPeriod {
  income_source?: {
    id: string;
    name: string;
    cadence: IncomeCadence;
    gross_amount: number;
    net_amount: number;
  };
  allocations?: Array<{
    id: string;
    budget_item_id: string;
    budget_item_name: string;
    budget_item_category: string;
    expected_amount: number;
    actual_amount: number | null;
    status: "PAID" | "UNPAID";
  }>;
  total_expected_allocations: number;
  total_actual_allocations: number;
  remaining_amount: number;
}

// Pay period generation configuration
export interface PayPeriodGenerationConfig {
  income_source_id: string;
  user_id: string;
  cadence: IncomeCadence;
  start_date: Date;
  expected_net: number;
}

// Pay period calculation results
export interface PayPeriodCalculation {
  start_date: Date;
  end_date: Date;
  expected_net: number;
  days_in_period: number;
}

// Pay period generation result
export interface PayPeriodGenerationResult {
  success: boolean;
  pay_period?: PayPeriod;
  error?: string;
  message?: string;
}

// Pay period query filters
export interface PayPeriodFilters {
  user_id: string;
  status?: PayPeriodStatus;
  income_source_id?: string;
  start_date_from?: Date;
  start_date_to?: Date;
  limit?: number;
  offset?: number;
}

// Pay period statistics
export interface PayPeriodStats {
  total_periods: number;
  active_periods: number;
  completed_periods: number;
  total_expected: number;
  total_actual: number;
  average_period_length_days: number;
  completion_rate: number;
}

// Cadence calculation helpers
export interface CadenceInfo {
  cadence: IncomeCadence;
  days_between_periods: number;
  periods_per_year: number;
  display_name: string;
}

// Pay period validation result
export interface PayPeriodValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// Constants for cadence calculations
export const CADENCE_CONFIG: Record<IncomeCadence, CadenceInfo> = {
  weekly: {
    cadence: "weekly",
    days_between_periods: 7,
    periods_per_year: 52,
    display_name: "Weekly",
  },
  "bi-weekly": {
    cadence: "bi-weekly",
    days_between_periods: 14,
    periods_per_year: 26,
    display_name: "Bi-Weekly",
  },
  "semi-monthly": {
    cadence: "semi-monthly",
    days_between_periods: 15, // Approximate - actual calculation is more complex
    periods_per_year: 24,
    display_name: "Semi-Monthly",
  },
  monthly: {
    cadence: "monthly",
    days_between_periods: 30, // Approximate - actual calculation uses month boundaries
    periods_per_year: 12,
    display_name: "Monthly",
  },
  quarterly: {
    cadence: "quarterly",
    days_between_periods: 91, // Approximate - actual calculation uses quarter boundaries
    periods_per_year: 4,
    display_name: "Quarterly",
  },
  annual: {
    cadence: "annual",
    days_between_periods: 365,
    periods_per_year: 1,
    display_name: "Annual",
  },
};

// Helper type for API responses
export interface PayPeriodAPIResponse<T = PayPeriod> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PayPeriodListAPIResponse {
  data?: PayPeriod[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}
