// This file will be generated from Supabase CLI after project setup
// For now, we'll use a placeholder structure based on our PRD requirements

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
          id?: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
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
          cadence:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          start_date: string;
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
          cadence:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          start_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          gross_amount?: number;
          net_amount?: number;
          cadence?:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          start_date?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      budget_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category:
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
          value: number;
          cadence:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          depends_on: string[] | null;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category:
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
          value: number;
          cadence:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          depends_on?: string[] | null;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?:
            | "Bills"
            | "Savings"
            | "Debt"
            | "Giving"
            | "Discretionary"
            | "Other";
          calc_type?:
            | "FIXED"
            | "GROSS_PERCENT"
            | "NET_PERCENT"
            | "REMAINING_PERCENT";
          value?: number;
          cadence?:
            | "weekly"
            | "bi-weekly"
            | "semi-monthly"
            | "monthly"
            | "quarterly"
            | "annual";
          depends_on?: string[] | null;
          priority?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      // Additional tables will be added as we progress
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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
