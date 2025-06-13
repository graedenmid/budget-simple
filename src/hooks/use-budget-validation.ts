import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getBudgetItemsForUser,
  getIncomeSourcesForUser,
} from "@/lib/database/client-queries";
import {
  validateBudgetItems,
  generateConflictResolutions,
  type ValidationResult,
  type ConflictResolution,
} from "@/lib/validation/budget-validation";
import type { BudgetItem, IncomeSource } from "@/types/database";

interface UseBudgetValidationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  budgetItems?: BudgetItem[];
  incomeSources?: IncomeSource[];
}

interface UseBudgetValidationReturn {
  validationResult: ValidationResult | null;
  resolutions: ConflictResolution[];
  isLoading: boolean;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  refresh: () => Promise<void>;
  validateItems: (
    items: BudgetItem[],
    sources: IncomeSource[]
  ) => ValidationResult;
}

export function useBudgetValidation(
  options: UseBudgetValidationOptions = {}
): UseBudgetValidationReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    budgetItems: propBudgetItems,
    incomeSources: propIncomeSources,
  } = options;

  const { user } = useAuth();
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Validate items function
  const validateItems = useCallback(
    (items: BudgetItem[], sources: IncomeSource[]): ValidationResult => {
      return validateBudgetItems(items, sources);
    },
    []
  );

  // Load data from database
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const [items, sources] = await Promise.all([
        propBudgetItems
          ? Promise.resolve(propBudgetItems)
          : getBudgetItemsForUser(user.id, false),
        propIncomeSources
          ? Promise.resolve(propIncomeSources)
          : getIncomeSourcesForUser(user.id),
      ]);

      // Run validation
      const result = validateBudgetItems(items, sources);
      setValidationResult(result);

      // Generate resolutions
      const conflictResolutions = generateConflictResolutions(
        result.issues,
        items
      );
      setResolutions(conflictResolutions);
    } catch (error) {
      console.error("Failed to load data for validation:", error);
      setValidationResult(null);
      setResolutions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, propBudgetItems, propIncomeSources]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user, loadData]);

  // Re-validate when prop data changes
  useEffect(() => {
    if (propBudgetItems && propIncomeSources) {
      const result = validateBudgetItems(propBudgetItems, propIncomeSources);
      setValidationResult(result);

      const conflictResolutions = generateConflictResolutions(
        result.issues,
        propBudgetItems
      );
      setResolutions(conflictResolutions);

      setIsLoading(false);
    }
  }, [propBudgetItems, propIncomeSources]);

  return {
    validationResult,
    resolutions,
    isLoading,
    isValid: validationResult?.isValid ?? false,
    errorCount: validationResult?.summary.errorCount ?? 0,
    warningCount: validationResult?.summary.warningCount ?? 0,
    infoCount: validationResult?.summary.infoCount ?? 0,
    refresh,
    validateItems,
  };
}
