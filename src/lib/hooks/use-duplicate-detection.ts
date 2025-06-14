import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ExpenseService } from "@/lib/services/expense-service";
import { logger } from "@/lib/error-handling";
import type {
  ExpenseCreateData,
  ExpenseValidationResult,
  DuplicateDetectionOptions,
  ExpenseWithDetails,
} from "@/lib/types/expenses";

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

export interface DuplicateDetectionState {
  isDuplicate: boolean;
  duplicateExpense?: ExpenseWithDetails;
  validationResult?: ExpenseValidationResult;
  loading: boolean;
  error: string | null;
}

export interface DuplicateDetectionActions {
  checkForDuplicates: (
    expenseData: ExpenseCreateData,
    options?: DuplicateDetectionOptions
  ) => Promise<ExpenseValidationResult | null>;
  clearDuplicateState: () => void;
  getDuplicateExpense: (
    expenseId: string
  ) => Promise<ExpenseWithDetails | null>;
}

/**
 * Hook for duplicate detection functionality
 */
export function useDuplicateDetection(): DuplicateDetectionState &
  DuplicateDetectionActions {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<
    ExpenseValidationResult | undefined
  >();
  const [duplicateExpense, setDuplicateExpense] = useState<
    ExpenseWithDetails | undefined
  >();

  // Check for duplicate expenses
  const checkForDuplicates = useCallback(
    async (
      expenseData: ExpenseCreateData,
      options: DuplicateDetectionOptions = {}
    ): Promise<ExpenseValidationResult | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        setValidationResult(undefined);
        setDuplicateExpense(undefined);

        // Use default options if not provided
        const duplicateOptions: DuplicateDetectionOptions = {
          amount_tolerance: 0,
          date_tolerance_days: 1, // Allow 1-day tolerance by default
          description_similarity: 0.8,
          check_category: true,
          ...options,
        };

        const result = await expenseService.checkForDuplicates(
          user.id,
          expenseData,
          duplicateOptions
        );

        setValidationResult(result);

        // If duplicate found, fetch the full expense details
        if (result.is_duplicate && result.duplicate_expense_id) {
          const duplicate = await expenseService.getExpenseById(
            result.duplicate_expense_id,
            true // Include details
          );
          if (duplicate) {
            setDuplicateExpense(duplicate);
          }
        }

        return result;
      } catch (err) {
        const errorMessage = "Failed to check for duplicates";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, expenseData });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Get duplicate expense details
  const getDuplicateExpense = useCallback(
    async (expenseId: string): Promise<ExpenseWithDetails | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const expense = await expenseService.getExpenseById(expenseId, true);
        return expense;
      } catch (err) {
        const errorMessage = "Failed to fetch duplicate expense";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, expenseId });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Clear duplicate detection state
  const clearDuplicateState = useCallback(() => {
    setError(null);
    setValidationResult(undefined);
    setDuplicateExpense(undefined);
    setLoading(false);
  }, []);

  // Computed state
  const isDuplicate = validationResult?.is_duplicate ?? false;

  return {
    // State
    isDuplicate,
    duplicateExpense,
    validationResult,
    loading,
    error,
    // Actions
    checkForDuplicates,
    clearDuplicateState,
    getDuplicateExpense,
  };
}

/**
 * Hook for bulk duplicate detection
 */
export function useBulkDuplicateDetection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{
      expense: ExpenseCreateData;
      validation: ExpenseValidationResult;
      duplicateExpense?: ExpenseWithDetails;
    }>
  >([]);

  const checkBulkDuplicates = useCallback(
    async (
      expenses: ExpenseCreateData[],
      options: DuplicateDetectionOptions = {}
    ) => {
      if (!user) {
        setError("User not authenticated");
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        setResults([]);

        const duplicateOptions: DuplicateDetectionOptions = {
          amount_tolerance: 0,
          date_tolerance_days: 1,
          description_similarity: 0.8,
          check_category: true,
          ...options,
        };

        const results: Array<{
          expense: ExpenseCreateData;
          validation: ExpenseValidationResult;
          duplicateExpense?: ExpenseWithDetails;
        }> = [];

        // Check each expense for duplicates
        for (const expense of expenses) {
          try {
            const validation = await expenseService.checkForDuplicates(
              user.id,
              expense,
              duplicateOptions
            );

            let duplicateExpense: ExpenseWithDetails | undefined;
            if (validation.is_duplicate && validation.duplicate_expense_id) {
              duplicateExpense =
                (await expenseService.getExpenseById(
                  validation.duplicate_expense_id,
                  true
                )) || undefined;
            }

            results.push({
              expense,
              validation,
              duplicateExpense,
            });
          } catch (err) {
            // Log the error for debugging
            logError(err, "Failed to check individual expense for duplicates", {
              userId: user.id,
              expense,
            });

            // Add error result for this expense
            results.push({
              expense,
              validation: {
                is_valid: false,
                errors: ["Failed to check for duplicates"],
                warnings: [],
                is_duplicate: false,
              },
            });
          }
        }

        setResults(results);
        return results;
      } catch (err) {
        const errorMessage = "Failed to check bulk duplicates";
        setError(errorMessage);
        logError(err, errorMessage, {
          userId: user.id,
          expenseCount: expenses.length,
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const clearBulkResults = useCallback(() => {
    setError(null);
    setResults([]);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    results,
    checkBulkDuplicates,
    clearBulkResults,
  };
}
