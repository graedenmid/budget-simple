import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { BudgetTrackingService } from "@/lib/services/budget-tracking-service";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling";
import type {
  BudgetItemSpending,
  PayPeriodBudgetTracking,
} from "@/lib/services/budget-tracking-service";

const budgetTrackingService = new BudgetTrackingService();

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
 * Hook for tracking budget item spending for a specific pay period
 */
export function useBudgetItemSpending(payPeriodId: string | null) {
  const { user } = useAuth();
  const [spendingData, setSpendingData] = useState<BudgetItemSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load budget item spending data
  const loadSpendingData = useCallback(async () => {
    if (!user || !payPeriodId) {
      setSpendingData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await budgetTrackingService.getBudgetItemSpending(
        payPeriodId,
        user.id
      );
      setSpendingData(data);
    } catch (err) {
      const errorMessage = "Failed to load budget item spending";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, payPeriodId });
    } finally {
      setLoading(false);
    }
  }, [user, payPeriodId]);

  // Refresh data
  const refresh = useCallback(() => {
    loadSpendingData();
  }, [loadSpendingData]);

  // Set up real-time subscriptions for expenses and allocations changes
  useEffect(() => {
    if (!user || !payPeriodId) return;

    const subscription = supabase
      .channel(`budget-tracking-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh(); // Reload data when expenses change
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
        },
        () => {
          refresh(); // Reload data when allocations change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, payPeriodId, refresh, supabase]);

  // Initial load
  useEffect(() => {
    loadSpendingData();
  }, [loadSpendingData]);

  return {
    spendingData,
    loading,
    error,
    refresh,
    clearError: () => setError(null),
  };
}

/**
 * Hook for complete pay period budget tracking
 */
export function usePayPeriodBudgetTracking(payPeriodId: string | null) {
  const { user } = useAuth();
  const [trackingData, setTrackingData] =
    useState<PayPeriodBudgetTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load complete tracking data
  const loadTrackingData = useCallback(async () => {
    if (!user || !payPeriodId) {
      setTrackingData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await budgetTrackingService.getPayPeriodBudgetTracking(
        payPeriodId,
        user.id
      );
      setTrackingData(data);
    } catch (err) {
      const errorMessage = "Failed to load pay period budget tracking";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, payPeriodId });
    } finally {
      setLoading(false);
    }
  }, [user, payPeriodId]);

  // Refresh data
  const refresh = useCallback(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !payPeriodId) return;

    const subscription = supabase
      .channel(`pay-period-tracking-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
        },
        refresh
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, payPeriodId, refresh, supabase]);

  // Initial load
  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  return {
    trackingData,
    loading,
    error,
    refresh,
    clearError: () => setError(null),
  };
}

/**
 * Hook for budget item spending history across multiple pay periods
 */
export function useBudgetItemHistory(
  budgetItemId: string | null,
  limit: number = 6
) {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<BudgetItemSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load history data
  const loadHistoryData = useCallback(async () => {
    if (!user || !budgetItemId) {
      setHistoryData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await budgetTrackingService.getBudgetItemHistory(
        budgetItemId,
        user.id,
        limit
      );
      setHistoryData(data);
    } catch (err) {
      const errorMessage = "Failed to load budget item history";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, budgetItemId, limit });
    } finally {
      setLoading(false);
    }
  }, [user, budgetItemId, limit]);

  // Refresh data
  const refresh = useCallback(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Initial load
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  return {
    historyData,
    loading,
    error,
    refresh,
    clearError: () => setError(null),
  };
}

/**
 * Hook for budget item summary statistics
 */
export function useBudgetItemSummary(budgetItemId: string | null) {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<{
    totalExpenses: number;
    averageSpending: number;
    totalBudgeted: number;
    averageBudgeted: number;
    overBudgetCount: number;
    underBudgetCount: number;
    onBudgetCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load summary data
  const loadSummaryData = useCallback(async () => {
    if (!user || !budgetItemId) {
      setSummaryData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await budgetTrackingService.getBudgetItemSummary(
        budgetItemId,
        user.id
      );
      setSummaryData(data);
    } catch (err) {
      const errorMessage = "Failed to load budget item summary";
      setError(errorMessage);
      logError(err, errorMessage, { userId: user.id, budgetItemId });
    } finally {
      setLoading(false);
    }
  }, [user, budgetItemId]);

  // Refresh data
  const refresh = useCallback(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  // Initial load
  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  return {
    summaryData,
    loading,
    error,
    refresh,
    clearError: () => setError(null),
  };
}
