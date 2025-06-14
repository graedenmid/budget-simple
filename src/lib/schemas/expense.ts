import { z } from "zod";
import { isValidCategory } from "@/lib/constants/expense-categories";

// Expense types from database enum
export const EXPENSE_TYPES = ["BUDGET_PAYMENT", "EXPENSE"] as const;

// Base expense schema without refinements
const baseExpenseSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be less than 255 characters")
    .trim(),

  amount: z
    .number()
    .min(0.01, "Amount must be greater than 0")
    .max(999999.99, "Amount is too large")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),

  date: z
    .string()
    .refine(
      (date) => {
        // Check if date is a valid ISO date string
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
      },
      {
        message: "Invalid date format",
      }
    )
    .refine(
      (date) => {
        // Check if date is not in the future (allow today)
        const expenseDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return expenseDate <= today;
      },
      {
        message: "Expense date cannot be in the future",
      }
    )
    .refine(
      (date) => {
        // Check if date is not too far in the past (5 years)
        const expenseDate = new Date(date);
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        return expenseDate >= fiveYearsAgo;
      },
      {
        message: "Expense date cannot be more than 5 years ago",
      }
    ),

  category: z.string().min(1, "Category is required").refine(isValidCategory, {
    message: "Invalid expense category",
  }),

  type: z.enum(EXPENSE_TYPES).default("EXPENSE"),

  pay_period_id: z.string().uuid("Invalid pay period ID").optional().nullable(),

  budget_item_id: z
    .string()
    .uuid("Invalid budget item ID")
    .optional()
    .nullable(),
});

// Expense creation schema with additional validation
export const expenseCreateSchema = baseExpenseSchema
  .refine(
    (data) => {
      // Budget payments must have a budget item linked
      if (data.type === "BUDGET_PAYMENT" && !data.budget_item_id) {
        return false;
      }
      return true;
    },
    {
      message: "Budget payments must be linked to a budget item",
      path: ["budget_item_id"],
    }
  )
  .refine(
    (data) => {
      // If budget item is linked, it should be a budget payment
      if (data.budget_item_id && data.type !== "BUDGET_PAYMENT") {
        return false;
      }
      return true;
    },
    {
      message:
        "Expenses linked to budget items should be marked as budget payments",
      path: ["type"],
    }
  );

export type ExpenseCreateData = z.infer<typeof expenseCreateSchema>;

// Expense update schema (all fields optional except validation rules still apply)
export const expenseUpdateSchema = baseExpenseSchema
  .partial()
  .refine(
    (data) => {
      // If type is being set to BUDGET_PAYMENT, budget_item_id must be provided or already exist
      if (data.type === "BUDGET_PAYMENT" && data.budget_item_id === null) {
        return false;
      }
      return true;
    },
    {
      message: "Budget payments must be linked to a budget item",
      path: ["budget_item_id"],
    }
  )
  .refine(
    (data) => {
      // If budget_item_id is being set, type should be BUDGET_PAYMENT
      if (data.budget_item_id && data.type === "EXPENSE") {
        return false;
      }
      return true;
    },
    {
      message:
        "Expenses linked to budget items should be marked as budget payments",
      path: ["type"],
    }
  );

export type ExpenseUpdateData = z.infer<typeof expenseUpdateSchema>;

// Expense filters schema for search and filtering
export const expenseFiltersSchema = z
  .object({
    start_date: z
      .string()
      .refine(
        (date) => {
          if (!date) return true;
          const parsedDate = new Date(date);
          return !isNaN(parsedDate.getTime());
        },
        {
          message: "Invalid start date format",
        }
      )
      .optional(),

    end_date: z
      .string()
      .refine(
        (date) => {
          if (!date) return true;
          const parsedDate = new Date(date);
          return !isNaN(parsedDate.getTime());
        },
        {
          message: "Invalid end date format",
        }
      )
      .optional(),

    category: z
      .string()
      .refine((cat) => !cat || isValidCategory(cat), {
        message: "Invalid expense category",
      })
      .optional(),

    min_amount: z
      .number()
      .min(0, "Minimum amount cannot be negative")
      .optional(),

    max_amount: z
      .number()
      .min(0, "Maximum amount cannot be negative")
      .optional(),

    type: z.enum(EXPENSE_TYPES).optional(),

    pay_period_id: z.string().uuid("Invalid pay period ID").optional(),

    budget_item_id: z.string().uuid("Invalid budget item ID").optional(),

    search: z.string().max(100, "Search term is too long").trim().optional(),
  })
  .refine(
    (data) => {
      // End date must be after start date
      if (data.start_date && data.end_date) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        return endDate >= startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      // Max amount must be greater than min amount
      if (data.min_amount !== undefined && data.max_amount !== undefined) {
        return data.max_amount >= data.min_amount;
      }
      return true;
    },
    {
      message: "Maximum amount must be greater than minimum amount",
      path: ["max_amount"],
    }
  );

export type ExpenseFiltersData = z.infer<typeof expenseFiltersSchema>;

// Batch expense creation schema
export const expenseBatchCreateSchema = z.object({
  expenses: z
    .array(expenseCreateSchema)
    .min(1, "At least one expense is required")
    .max(100, "Cannot create more than 100 expenses at once"),
});

export type ExpenseBatchCreateData = z.infer<typeof expenseBatchCreateSchema>;

// Batch expense update schema
export const expenseBatchUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid("Invalid expense ID"),
        data: expenseUpdateSchema,
      })
    )
    .min(1, "At least one update is required")
    .max(100, "Cannot update more than 100 expenses at once"),
});

export type ExpenseBatchUpdateData = z.infer<typeof expenseBatchUpdateSchema>;

// Batch expense delete schema
export const expenseBatchDeleteSchema = z.object({
  expense_ids: z
    .array(z.string().uuid("Invalid expense ID"))
    .min(1, "At least one expense ID is required")
    .max(100, "Cannot delete more than 100 expenses at once"),
});

export type ExpenseBatchDeleteData = z.infer<typeof expenseBatchDeleteSchema>;

// Duplicate detection options schema
export const duplicateDetectionOptionsSchema = z.object({
  amount_tolerance: z
    .number()
    .min(0, "Amount tolerance cannot be negative")
    .max(1000, "Amount tolerance is too large")
    .default(0),

  date_tolerance_days: z
    .number()
    .int("Date tolerance must be a whole number")
    .min(0, "Date tolerance cannot be negative")
    .max(365, "Date tolerance cannot exceed 365 days")
    .default(0),

  description_similarity: z
    .number()
    .min(0, "Description similarity must be between 0 and 1")
    .max(1, "Description similarity must be between 0 and 1")
    .default(0.8),

  check_category: z.boolean().default(true),
});

export type DuplicateDetectionOptionsData = z.infer<
  typeof duplicateDetectionOptionsSchema
>;

// Expense import schema
export const expenseImportSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be less than 255 characters")
    .trim(),

  amount: z
    .number()
    .min(0.01, "Amount must be greater than 0")
    .max(999999.99, "Amount is too large"),

  date: z.string().refine(
    (date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    },
    {
      message: "Invalid date format",
    }
  ),

  category: z
    .string()
    .refine(isValidCategory, {
      message: "Invalid expense category",
    })
    .optional(),

  raw_data: z.record(z.unknown()).optional(),
});

export type ExpenseImportData = z.infer<typeof expenseImportSchema>;

// Expense validation result schema (for API responses)
export const expenseValidationResultSchema = z.object({
  is_valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  is_duplicate: z.boolean().optional(),
  duplicate_expense_id: z.string().uuid().optional(),
});

export type ExpenseValidationResultData = z.infer<
  typeof expenseValidationResultSchema
>;

// Helper functions for validation
export function validateExpenseCreate(data: unknown): ExpenseCreateData {
  return expenseCreateSchema.parse(data);
}

export function validateExpenseUpdate(data: unknown): ExpenseUpdateData {
  return expenseUpdateSchema.parse(data);
}

export function validateExpenseFilters(data: unknown): ExpenseFiltersData {
  return expenseFiltersSchema.parse(data);
}

export function validateExpenseBatchCreate(
  data: unknown
): ExpenseBatchCreateData {
  return expenseBatchCreateSchema.parse(data);
}

export function validateDuplicateDetectionOptions(
  data: unknown
): DuplicateDetectionOptionsData {
  return duplicateDetectionOptionsSchema.parse(data);
}

// Safe validation functions (return null instead of throwing)
export function safeValidateExpenseCreate(
  data: unknown
): ExpenseCreateData | null {
  try {
    return expenseCreateSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateExpenseUpdate(
  data: unknown
): ExpenseUpdateData | null {
  try {
    return expenseUpdateSchema.parse(data);
  } catch {
    return null;
  }
}

export function safeValidateExpenseFilters(
  data: unknown
): ExpenseFiltersData | null {
  try {
    return expenseFiltersSchema.parse(data);
  } catch {
    return null;
  }
}
