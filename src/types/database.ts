// Budget Simple Database Types
// Generated from database schema - keep in sync with migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string | null;
          updated_at?: string;
        };
      };
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          gross_amount: number;
          net_amount: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          gross_amount: number;
          net_amount: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          gross_amount?: number;
          net_amount?: number;
          cadence?: Database["public"]["Enums"]["income_cadence"];
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      budget_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: Database["public"]["Enums"]["budget_category"];
          calc_type: Database["public"]["Enums"]["calc_type"];
          value: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          depends_on: string[] | null;
          priority: number;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: Database["public"]["Enums"]["budget_category"];
          calc_type: Database["public"]["Enums"]["calc_type"];
          value: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          depends_on?: string[] | null;
          priority?: number;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: Database["public"]["Enums"]["budget_category"];
          calc_type?: Database["public"]["Enums"]["calc_type"];
          value?: number;
          cadence?: Database["public"]["Enums"]["income_cadence"];
          depends_on?: string[] | null;
          priority?: number;
          end_date?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      pay_periods: {
        Row: {
          id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          income_source_id: string;
          expected_net: number;
          actual_net: number | null;
          status: Database["public"]["Enums"]["pay_period_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_date: string;
          end_date: string;
          income_source_id: string;
          expected_net: number;
          actual_net?: number | null;
          status?: Database["public"]["Enums"]["pay_period_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          start_date?: string;
          end_date?: string;
          income_source_id?: string;
          expected_net?: number;
          actual_net?: number | null;
          status?: Database["public"]["Enums"]["pay_period_status"];
          updated_at?: string;
        };
      };
      allocations: {
        Row: {
          id: string;
          pay_period_id: string;
          budget_item_id: string;
          expected_amount: number;
          actual_amount: number | null;
          status: Database["public"]["Enums"]["allocation_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pay_period_id: string;
          budget_item_id: string;
          expected_amount: number;
          actual_amount?: number | null;
          status?: Database["public"]["Enums"]["allocation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          expected_amount?: number;
          actual_amount?: number | null;
          status?: Database["public"]["Enums"]["allocation_status"];
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          pay_period_id: string | null;
          category: string;
          description: string;
          amount: number;
          date: string;
          budget_item_id: string | null;
          type: Database["public"]["Enums"]["expense_type"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pay_period_id?: string | null;
          category: string;
          description: string;
          amount: number;
          date: string;
          budget_item_id?: string | null;
          type?: Database["public"]["Enums"]["expense_type"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pay_period_id?: string | null;
          category?: string;
          description?: string;
          amount?: number;
          date?: string;
          budget_item_id?: string | null;
          type?: Database["public"]["Enums"]["expense_type"];
          updated_at?: string;
        };
      };
      suggestions: {
        Row: {
          id: string;
          pay_period_id: string;
          type: string;
          amount: number;
          status: Database["public"]["Enums"]["suggestion_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pay_period_id: string;
          type: string;
          amount: number;
          status?: Database["public"]["Enums"]["suggestion_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: string;
          amount?: number;
          status?: Database["public"]["Enums"]["suggestion_status"];
          updated_at?: string;
        };
      };
      income_history: {
        Row: {
          id: string;
          income_source_id: string;
          user_id: string;
          change_type: Database["public"]["Enums"]["income_change_type"];
          name: string;
          gross_amount: number;
          net_amount: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          start_date: string;
          is_active: boolean;
          changed_fields: string[] | null;
          previous_values: Json | null;
          new_values: Json | null;
          change_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          income_source_id: string;
          user_id: string;
          change_type: Database["public"]["Enums"]["income_change_type"];
          name: string;
          gross_amount: number;
          net_amount: number;
          cadence: Database["public"]["Enums"]["income_cadence"];
          start_date: string;
          is_active: boolean;
          changed_fields?: string[] | null;
          previous_values?: Json | null;
          new_values?: Json | null;
          change_reason?: string | null;
          created_at?: string;
        };
        Update: {
          change_type?: Database["public"]["Enums"]["income_change_type"];
          name?: string;
          gross_amount?: number;
          net_amount?: number;
          cadence?: Database["public"]["Enums"]["income_cadence"];
          start_date?: string;
          is_active?: boolean;
          changed_fields?: string[] | null;
          previous_values?: Json | null;
          new_values?: Json | null;
          change_reason?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      income_cadence:
        | "weekly"
        | "bi-weekly"
        | "semi-monthly"
        | "monthly"
        | "quarterly"
        | "annual";
      budget_category:
        | "Bills"
        | "Savings"
        | "Debt"
        | "Giving"
        | "Discretionary"
        | "Other";
      calc_type:
        | "FIXED"
        | "GROSS_PERCENT"
        | "NET_PERCENT"
        | "REMAINING_PERCENT";
      pay_period_status: "ACTIVE" | "COMPLETED";
      allocation_status: "PAID" | "UNPAID";
      expense_type: "BUDGET_PAYMENT" | "EXPENSE";
      suggestion_status: "PENDING" | "APPLIED";
      income_change_type:
        | "CREATED"
        | "UPDATED"
        | "ACTIVATED"
        | "DEACTIVATED"
        | "DELETED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper type aliases for easier use
export type User = Database["public"]["Tables"]["users"]["Row"];
export type IncomeSource =
  Database["public"]["Tables"]["income_sources"]["Row"];
export type BudgetItem = Database["public"]["Tables"]["budget_items"]["Row"];
export type PayPeriod = Database["public"]["Tables"]["pay_periods"]["Row"];
export type Allocation = Database["public"]["Tables"]["allocations"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Suggestion = Database["public"]["Tables"]["suggestions"]["Row"];
export type IncomeHistory =
  Database["public"]["Tables"]["income_history"]["Row"];

export type IncomeCadence = Database["public"]["Enums"]["income_cadence"];
export type BudgetCategory = Database["public"]["Enums"]["budget_category"];
export type CalcType = Database["public"]["Enums"]["calc_type"];
export type PayPeriodStatus = Database["public"]["Enums"]["pay_period_status"];
export type AllocationStatus = Database["public"]["Enums"]["allocation_status"];
export type ExpenseType = Database["public"]["Enums"]["expense_type"];
export type SuggestionStatus = Database["public"]["Enums"]["suggestion_status"];
export type IncomeChangeType =
  Database["public"]["Enums"]["income_change_type"];
