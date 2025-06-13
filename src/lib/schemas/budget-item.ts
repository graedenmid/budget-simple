import { z } from "zod";
import type { Database } from "@/types/database";

// Budget item categories from database enum
export const BUDGET_CATEGORIES = [
  "Bills",
  "Savings",
  "Debt",
  "Giving",
  "Discretionary",
  "Other",
] as const;

// Calculation types from database enum
export const CALC_TYPES = [
  "FIXED",
  "GROSS_PERCENT",
  "NET_PERCENT",
  "REMAINING_PERCENT",
] as const;

// Income cadences from database enum
export const INCOME_CADENCES = [
  "weekly",
  "bi-weekly",
  "semi-monthly",
  "monthly",
  "quarterly",
  "annual",
] as const;

// Base budget item schema without refinements
const baseBudgetItemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),

  category: z.enum(BUDGET_CATEGORIES, {
    required_error: "Category is required",
  }),

  calc_type: z.enum(CALC_TYPES, {
    required_error: "Calculation type is required",
  }),

  value: z
    .number()
    .min(0.01, "Value must be greater than 0")
    .max(999999.99, "Value is too large"),

  cadence: z.enum(INCOME_CADENCES, {
    required_error: "Cadence is required",
  }),

  depends_on: z
    .array(z.string().uuid("Invalid dependency ID"))
    .optional()
    .default([]),

  priority: z
    .number()
    .int("Priority must be a whole number")
    .min(0, "Priority cannot be negative")
    .max(1000, "Priority cannot exceed 1000")
    .default(0),

  is_active: z.boolean().default(true),
});

// Budget item form validation schema with refinements
export const budgetItemSchema = baseBudgetItemSchema
  .refine(
    (data) => {
      // Percentage validation for percentage-based calculations
      if (
        ["GROSS_PERCENT", "NET_PERCENT", "REMAINING_PERCENT"].includes(
          data.calc_type
        )
      ) {
        return data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage values cannot exceed 100%",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      // Dependencies validation for REMAINING_PERCENT
      if (
        data.calc_type === "REMAINING_PERCENT" &&
        (!data.depends_on || data.depends_on.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "REMAINING_PERCENT calculation requires at least one dependency",
      path: ["depends_on"],
    }
  );

// Type inference from schema
export type BudgetItemFormData = z.infer<typeof budgetItemSchema>;

// Insert schema for database operations
export const budgetItemInsertSchema = baseBudgetItemSchema
  .extend({
    user_id: z.string().uuid("Invalid user ID"),
  })
  .refine(
    (data) => {
      // Percentage validation for percentage-based calculations
      if (
        ["GROSS_PERCENT", "NET_PERCENT", "REMAINING_PERCENT"].includes(
          data.calc_type
        )
      ) {
        return data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage values cannot exceed 100%",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      // Dependencies validation for REMAINING_PERCENT
      if (
        data.calc_type === "REMAINING_PERCENT" &&
        (!data.depends_on || data.depends_on.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "REMAINING_PERCENT calculation requires at least one dependency",
      path: ["depends_on"],
    }
  );

export type BudgetItemInsertData = z.infer<typeof budgetItemInsertSchema>;

// Update schema for database operations
export const budgetItemUpdateSchema = baseBudgetItemSchema.partial();

export type BudgetItemUpdateData = z.infer<typeof budgetItemUpdateSchema>;

// Category display information
export const CATEGORY_INFO: Record<
  Database["public"]["Enums"]["budget_category"],
  {
    label: string;
    description: string;
    icon: string;
    color: string;
  }
> = {
  Bills: {
    label: "Bills",
    description: "Fixed monthly expenses like rent, utilities, insurance",
    icon: "🏠",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  Savings: {
    label: "Savings",
    description: "Emergency fund, retirement, long-term savings goals",
    icon: "💰",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  Debt: {
    label: "Debt",
    description: "Credit cards, loans, debt repayment",
    icon: "💳",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  Giving: {
    label: "Giving",
    description: "Charitable donations, tithing, gifts",
    icon: "🎁",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  Discretionary: {
    label: "Discretionary",
    description: "Entertainment, dining out, hobbies, personal spending",
    icon: "🎯",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  Other: {
    label: "Other",
    description: "Miscellaneous expenses that don't fit other categories",
    icon: "📋",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

// Calculation type display information
export const CALC_TYPE_INFO: Record<
  Database["public"]["Enums"]["calc_type"],
  {
    label: string;
    description: string;
    valueLabel: string;
    example: string;
  }
> = {
  FIXED: {
    label: "Fixed Amount",
    description: "A specific dollar amount each pay period",
    valueLabel: "Amount ($)",
    example: "$500 for rent every month",
  },
  GROSS_PERCENT: {
    label: "% of Gross Income",
    description: "Percentage of your gross (before-tax) income",
    valueLabel: "Percentage (%)",
    example: "10% of gross income for retirement",
  },
  NET_PERCENT: {
    label: "% of Net Income",
    description: "Percentage of your net (after-tax) income",
    valueLabel: "Percentage (%)",
    example: "15% of net income for savings",
  },
  REMAINING_PERCENT: {
    label: "% of Remaining Income",
    description: "Percentage of income left after other budget items",
    valueLabel: "Percentage (%)",
    example: "50% of remaining income for discretionary spending",
  },
};
