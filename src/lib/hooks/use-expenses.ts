import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ExpenseService } from "@/lib/services/expense-service";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling";
import type {
  Expense,
  ExpenseWithDetails,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseValidationResult,
} from "@/lib/types/expenses";
import { validateExpenseComprehensive } from "@/lib/utils/expense-validation";

const expenseService = new ExpenseService();

// Helper function for error logging
const logError = (
  error: unknown,
  message: string,
  context?: Record<string, unknown>
) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.logUnhandledError(
    new Error(`${message}: ${errorMessage}`),
    undefined,
    context
  );
};

/**
 * Hook for managing expenses with filtering and pagination
 */
export function useExpenses(
  filters?: ExpenseFilters,
  options?: {
    limit?: number;
    autoRefresh?: boolean;
  }
) {
  const { user } = useAuth();
  const { limit = 50, autoRefresh = true } = options || {};

  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const supabase = createClient();

  // Load expenses
  const loadExpenses = useCallback(
    async (reset = false) => {
      if (!user) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const currentOffset = reset ? 0 : offset;
        const expensesData = await expenseService.getExpenses(
          user.id,
          filters,
          limit,
          currentOffset
        );

        if (reset) {
          setExpenses(expensesData);
          setOffset(limit);
        } else {
          setExpenses((prev) => [...prev, ...expensesData]);
          setOffset((prev) => prev + limit);
        }

        setHasMore(expensesData.length === limit);
      } catch (err) {
        const errorMessage = "Failed to load expenses";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, filters });
      } finally {
        setLoading(false);
      }
    },
    [user, filters, limit, offset]
  );

  // Refresh expenses (reset pagination)
  const refresh = useCallback(() => {
    setOffset(0);
    loadExpenses(true);
  }, [loadExpenses]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !autoRefresh) return;

    const subscription = supabase
      .channel(`expenses-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh(); // Reload data on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, autoRefresh, refresh, supabase]);

  // Initial load
  useEffect(() => {
    loadExpenses(true);
  }, [loadExpenses]);

  return {
    expenses,
    loading,
    error,
    hasMore,
    loadMore: () => {
      if (!loading && hasMore) {
        loadExpenses(false);
      }
    },
    refresh,
    clearError: () => setError(null),
  };
}

/**
 * Hook for expense CRUD operations
 */
export function useExpenseOperations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create expense
  const createExpense = useCallback(
    async (expenseData: ExpenseCreateData): Promise<Expense | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        // Validate expense data
        const validation = validateExpenseComprehensive(expenseData);
        if (!validation.is_valid) {
          setError(validation.errors.join(", "));
          return null;
        }

        const expense = await expenseService.createExpense(
          user.id,
          expenseData
        );
        return expense;
      } catch (err) {
        const errorMessage = "Failed to create expense";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, expenseData });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Update expense
  const updateExpense = useCallback(
    async (
      expenseId: string,
      updates: ExpenseUpdateData
    ): Promise<Expense | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        // Validate expense updates
        const validation = validateExpenseComprehensive(updates);
        if (!validation.is_valid) {
          setError(validation.errors.join(", "));
          return null;
        }

        const expense = await expenseService.updateExpense(
          expenseId,
          updates,
          user.id
        );
        return expense;
      } catch (err) {
        const errorMessage = "Failed to update expense";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, expenseId, updates });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Delete expense
  const deleteExpense = useCallback(
    async (expenseId: string): Promise<boolean> => {
      if (!user) {
        setError("User not authenticated");
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        await expenseService.deleteExpense(expenseId, user.id);
        return true;
      } catch (err) {
        const errorMessage = "Failed to delete expense";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, expenseId });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    clearError: () => setError(null),
  };
}

/**
 * Hook for expense summary and analytics
 */
export function useExpenseSummary(filters?: ExpenseFilters) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load expense summary
  const loadSummary = useCallback(async () => {
    if (!user) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const summaryData = await expenseService.getExpenseSummary(
        user.id,
        filters
      );
      setSummary(summaryData);
    } catch (err) {
      const errorMessage = "Failed to load expense summary";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, filters });
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Set up real-time subscriptions for summary updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`expense-summary-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Expense summary change:", payload);
          loadSummary(); // Reload summary on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, loadSummary, supabase]);

  // Initial load
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    loading,
    error,
    refresh: loadSummary,
    clearError: () => setError(null),
  };
}

/**
 * Hook for expenses related to a specific pay period
 */
export function usePayPeriodExpenses(payPeriodId: string | null) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load expenses for pay period
  const loadExpenses = useCallback(async () => {
    if (!payPeriodId || !user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const expensesData = await expenseService.getExpensesForPayPeriod(
        payPeriodId,
        user.id
      );
      setExpenses(expensesData);
    } catch (err) {
      const errorMessage = "Failed to load pay period expenses";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, payPeriodId });
    } finally {
      setLoading(false);
    }
  }, [payPeriodId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!payPeriodId || !user) return;

    const subscription = supabase
      .channel(`pay-period-expenses-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        (payload) => {
          console.log("Pay period expense change:", payload);
          loadExpenses(); // Reload data on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [payPeriodId, user, loadExpenses, supabase]);

  // Initial load
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    loading,
    error,
    refresh: loadExpenses,
    clearError: () => setError(null),
  };
}

/**
 * Hook for expenses related to a specific budget item
 */
export function useBudgetItemExpenses(
  budgetItemId: string | null,
  dateRange?: { startDate?: string; endDate?: string }
) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load expenses for budget item
  const loadExpenses = useCallback(async () => {
    if (!budgetItemId || !user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const expensesData = await expenseService.getExpensesForBudgetItem(
        budgetItemId,
        user.id,
        dateRange?.startDate,
        dateRange?.endDate
      );
      setExpenses(expensesData);
    } catch (err) {
      const errorMessage = "Failed to load budget item expenses";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, budgetItemId, dateRange });
    } finally {
      setLoading(false);
    }
  }, [budgetItemId, user, dateRange]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!budgetItemId || !user) return;

    const subscription = supabase
      .channel(`budget-item-expenses-${budgetItemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `budget_item_id=eq.${budgetItemId}`,
        },
        (payload) => {
          console.log("Budget item expense change:", payload);
          loadExpenses(); // Reload data on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [budgetItemId, user, loadExpenses, supabase]);

  // Initial load
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    loading,
    error,
    refresh: loadExpenses,
    clearError: () => setError(null),
  };
}

/**
 * Hook for expense validation with real-time feedback
 */
export function useExpenseValidation() {
  const [validationResult, setValidationResult] =
    useState<ExpenseValidationResult | null>(null);

  const validateExpense = useCallback(
    (
      expenseData: ExpenseCreateData | ExpenseUpdateData,
      context?: Parameters<typeof validateExpenseComprehensive>[1]
    ) => {
      try {
        const result = validateExpenseComprehensive(expenseData, context);
        setValidationResult(result);
        return result;
      } catch {
        const errorResult: ExpenseValidationResult = {
          is_valid: false,
          errors: ["Validation failed"],
          warnings: [],
        };
        setValidationResult(errorResult);
        return errorResult;
      }
    },
    []
  );

  return {
    validationResult,
    validateExpense,
    clearValidation: () => setValidationResult(null),
  };
}
