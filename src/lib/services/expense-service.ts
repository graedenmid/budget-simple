import { createClient } from "@/lib/supabase/client";
import type {
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  ExpenseWithDetails,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseCategorySummary,
  MonthlyExpenseSummary,
  ExpenseValidationResult,
  DuplicateDetectionOptions,
  ExpenseBatchCreate,
  ExpenseBatchUpdate,
  ExpenseBatchDelete,
} from "@/lib/types/expenses";

// Simple database error handler following existing pattern
function handleDatabaseError(error: unknown, message: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${errorMessage}`);
}

export class ExpenseService {
  private supabase = createClient();

  /**
   * Get expenses for a specific user with optional filters
   */
  async getExpenses(
    userId: string,
    filters?: ExpenseFilters,
    limit = 50,
    offset = 0
  ): Promise<ExpenseWithDetails[]> {
    try {
      let query = this.supabase
        .from("expenses")
        .select(
          `
          *,
          pay_periods (
            id,
            start_date,
            end_date,
            expected_net
          ),
          budget_items (
            id,
            name,
            category,
            calc_type,
            value
          )
        `
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters) {
        if (filters.start_date) {
          query = query.gte("date", filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte("date", filters.end_date);
        }
        if (filters.category) {
          query = query.eq("category", filters.category);
        }
        if (filters.min_amount !== undefined) {
          query = query.gte("amount", filters.min_amount);
        }
        if (filters.max_amount !== undefined) {
          query = query.lte("amount", filters.max_amount);
        }
        if (filters.type) {
          query = query.eq("type", filters.type);
        }
        if (filters.pay_period_id) {
          query = query.eq("pay_period_id", filters.pay_period_id);
        }
        if (filters.budget_item_id) {
          query = query.eq("budget_item_id", filters.budget_item_id);
        }
        if (filters.search) {
          query = query.ilike("description", `%${filters.search}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch expenses");
      }

      return (data || []) as ExpenseWithDetails[];
    } catch (error) {
      throw handleDatabaseError(error, "Failed to fetch expenses");
    }
  }

  /**
   * Get a single expense by ID
   */
  async getExpenseById(
    expenseId: string,
    includeDetails = false
  ): Promise<ExpenseWithDetails | null> {
    try {
      let query = this.supabase
        .from("expenses")
        .select("*")
        .eq("id", expenseId)
        .single();

      if (includeDetails) {
        query = this.supabase
          .from("expenses")
          .select(
            `
            *,
            pay_periods (
              id,
              start_date,
              end_date,
              expected_net
            ),
            budget_items (
              id,
              name,
              category,
              calc_type,
              value
            )
          `
          )
          .eq("id", expenseId)
          .single();
      }

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch expense");
      }

      return data as ExpenseWithDetails | null;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to fetch expense");
    }
  }

  /**
   * Create a new expense
   */
  async createExpense(
    userId: string,
    expenseData: ExpenseCreateData
  ): Promise<Expense> {
    try {
      const expenseInsert: ExpenseInsert = {
        user_id: userId,
        description: expenseData.description,
        amount: expenseData.amount,
        date: expenseData.date,
        category: expenseData.category,
        pay_period_id: expenseData.pay_period_id || null,
        budget_item_id: expenseData.budget_item_id || null,
        type: expenseData.type || "EXPENSE",
      };

      const { data, error } = await this.supabase
        .from("expenses")
        .insert(expenseInsert)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to create expense");
      }

      return data;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to create expense");
    }
  }

  /**
   * Update an existing expense
   */
  async updateExpense(
    expenseId: string,
    updates: ExpenseUpdateData,
    userId: string
  ): Promise<Expense> {
    try {
      const expenseUpdate: ExpenseUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from("expenses")
        .update(expenseUpdate)
        .eq("id", expenseId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to update expense");
      }

      return data;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to update expense");
    }
  }

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", userId);

      if (error) {
        throw handleDatabaseError(error, "Failed to delete expense");
      }
    } catch (error) {
      throw handleDatabaseError(error, "Failed to delete expense");
    }
  }

  /**
   * Get expense summary for a user
   */
  async getExpenseSummary(
    userId: string,
    filters?: ExpenseFilters
  ): Promise<ExpenseSummary> {
    try {
      // Get all expenses for the user with filters
      const expenses = await this.getExpenses(userId, filters, 1000, 0);

      // Calculate totals
      const totalAmount = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const totalExpenses = expenses.filter((e) => e.type === "EXPENSE").length;
      const totalBudgetPayments = expenses.filter(
        (e) => e.type === "BUDGET_PAYMENT"
      ).length;
      const expenseCount = expenses.length;

      // Calculate category summaries
      const categoryMap = new Map<string, { amount: number; count: number }>();
      expenses.forEach((expense) => {
        const existing = categoryMap.get(expense.category) || {
          amount: 0,
          count: 0,
        };
        categoryMap.set(expense.category, {
          amount: existing.amount + expense.amount,
          count: existing.count + 1,
        });
      });

      const categories: ExpenseCategorySummary[] = Array.from(
        categoryMap.entries()
      ).map(([category, data]) => ({
        category,
        total_amount: data.amount,
        expense_count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }));

      // Calculate monthly summaries
      const monthlyMap = new Map<
        string,
        {
          amount: number;
          count: number;
          budget_payments: number;
          general_expenses: number;
        }
      >();

      expenses.forEach((expense) => {
        const month = expense.date.substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(month) || {
          amount: 0,
          count: 0,
          budget_payments: 0,
          general_expenses: 0,
        };

        monthlyMap.set(month, {
          amount: existing.amount + expense.amount,
          count: existing.count + 1,
          budget_payments:
            existing.budget_payments +
            (expense.type === "BUDGET_PAYMENT" ? 1 : 0),
          general_expenses:
            existing.general_expenses + (expense.type === "EXPENSE" ? 1 : 0),
        });
      });

      const monthlyTotals: MonthlyExpenseSummary[] = Array.from(
        monthlyMap.entries()
      ).map(([month, data]) => ({
        month,
        total_amount: data.amount,
        expense_count: data.count,
        budget_payments: data.budget_payments,
        general_expenses: data.general_expenses,
      }));

      return {
        total_expenses: totalExpenses,
        total_budget_payments: totalBudgetPayments,
        total_amount: totalAmount,
        expense_count: expenseCount,
        categories: categories.sort((a, b) => b.total_amount - a.total_amount),
        monthly_totals: monthlyTotals.sort((a, b) =>
          b.month.localeCompare(a.month)
        ),
      };
    } catch (error) {
      throw handleDatabaseError(error, "Failed to get expense summary");
    }
  }

  /**
   * Check for duplicate expenses
   */
  async checkForDuplicates(
    userId: string,
    expenseData: ExpenseCreateData,
    options: DuplicateDetectionOptions = {}
  ): Promise<ExpenseValidationResult> {
    try {
      const {
        amount_tolerance = 0,
        date_tolerance_days = 0,
        description_similarity = 0.8,
        check_category = true,
      } = options;

      // Build date range for duplicate check
      const expenseDate = new Date(expenseData.date);
      const startDate = new Date(expenseDate);
      startDate.setDate(startDate.getDate() - date_tolerance_days);
      const endDate = new Date(expenseDate);
      endDate.setDate(endDate.getDate() + date_tolerance_days);

      // Query for potential duplicates
      let query = this.supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      // Add amount tolerance filter
      if (amount_tolerance === 0) {
        query = query.eq("amount", expenseData.amount);
      } else {
        query = query
          .gte("amount", expenseData.amount - amount_tolerance)
          .lte("amount", expenseData.amount + amount_tolerance);
      }

      // Add category filter if enabled
      if (check_category) {
        query = query.eq("category", expenseData.category);
      }

      const { data: potentialDuplicates, error } = await query;

      if (error) {
        throw handleDatabaseError(error, "Failed to check for duplicates");
      }

      // Check description similarity for potential duplicates
      const duplicates = (potentialDuplicates || []).filter((expense) => {
        if (description_similarity >= 1.0) {
          return (
            expense.description.toLowerCase() ===
            expenseData.description.toLowerCase()
          );
        }

        // Simple similarity check (can be enhanced with more sophisticated algorithms)
        const desc1 = expense.description.toLowerCase();
        const desc2 = expenseData.description.toLowerCase();
        const commonWords = desc1
          .split(" ")
          .filter((word: string) => desc2.includes(word));
        const similarity =
          commonWords.length /
          Math.max(desc1.split(" ").length, desc2.split(" ").length);

        return similarity >= description_similarity;
      });

      const isDuplicate = duplicates.length > 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      if (isDuplicate) {
        errors.push("Potential duplicate expense detected");
      }

      return {
        is_valid: !isDuplicate,
        errors,
        warnings,
        is_duplicate: isDuplicate,
        duplicate_expense_id: duplicates[0]?.id,
      };
    } catch (error) {
      throw handleDatabaseError(error, "Failed to validate expense");
    }
  }

  /**
   * Create multiple expenses in batch
   */
  async createExpensesBatch(batchData: ExpenseBatchCreate): Promise<Expense[]> {
    try {
      const expensesToInsert: ExpenseInsert[] = batchData.expenses.map(
        (expense) => ({
          user_id: batchData.user_id,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category,
          pay_period_id: expense.pay_period_id || null,
          budget_item_id: expense.budget_item_id || null,
          type: expense.type || "EXPENSE",
        })
      );

      const { data, error } = await this.supabase
        .from("expenses")
        .insert(expensesToInsert)
        .select();

      if (error) {
        throw handleDatabaseError(error, "Failed to create expenses batch");
      }

      return data || [];
    } catch (error) {
      throw handleDatabaseError(error, "Failed to create expenses batch");
    }
  }

  /**
   * Update multiple expenses in batch
   */
  async updateExpensesBatch(batchData: ExpenseBatchUpdate): Promise<Expense[]> {
    try {
      const updatedExpenses: Expense[] = [];

      // Process updates sequentially to maintain data integrity
      for (const update of batchData.updates) {
        const { data, error } = await this.supabase
          .from("expenses")
          .update({
            ...update.data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id)
          .select()
          .single();

        if (error) {
          throw handleDatabaseError(
            error,
            `Failed to update expense ${update.id}`
          );
        }

        if (data) {
          updatedExpenses.push(data);
        }
      }

      return updatedExpenses;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to update expenses batch");
    }
  }

  /**
   * Delete multiple expenses in batch
   */
  async deleteExpensesBatch(batchData: ExpenseBatchDelete): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("expenses")
        .delete()
        .in("id", batchData.expense_ids)
        .eq("user_id", batchData.user_id);

      if (error) {
        throw handleDatabaseError(error, "Failed to delete expenses batch");
      }
    } catch (error) {
      throw handleDatabaseError(error, "Failed to delete expenses batch");
    }
  }

  /**
   * Get expenses for a specific pay period
   */
  async getExpensesForPayPeriod(
    payPeriodId: string,
    userId: string
  ): Promise<ExpenseWithDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from("expenses")
        .select(
          `
          *,
          budget_items (
            id,
            name,
            category,
            calc_type,
            value
          )
        `
        )
        .eq("pay_period_id", payPeriodId)
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch expenses for pay period"
        );
      }

      return (data || []) as ExpenseWithDetails[];
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to fetch expenses for pay period"
      );
    }
  }

  /**
   * Get expenses for a specific budget item
   */
  async getExpensesForBudgetItem(
    budgetItemId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExpenseWithDetails[]> {
    try {
      let query = this.supabase
        .from("expenses")
        .select(
          `
          *,
          pay_periods (
            id,
            start_date,
            end_date,
            expected_net
          )
        `
        )
        .eq("budget_item_id", budgetItemId)
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch expenses for budget item"
        );
      }

      return (data || []) as ExpenseWithDetails[];
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to fetch expenses for budget item"
      );
    }
  }
}
