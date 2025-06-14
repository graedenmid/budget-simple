import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExpenseAnalyticsService } from "@/lib/services/expense-analytics-service";
import {
  ExpenseAnalytics,
  SpendingTrend,
  CategoryBreakdown,
  BudgetVsActual,
  ExpenseSummary,
} from "@/lib/types/expenses";
import { useAuth } from "@/lib/auth/auth-context";
import { createLogger } from "@/lib/error-handling/logger";

const supabase = createClient();
const logger = createLogger();

interface UseExpenseAnalyticsOptions {
  start_date?: string;
  end_date?: string;
  categories?: string[];
  refreshInterval?: number; // milliseconds
}

interface UseExpenseAnalyticsReturn {
  analytics: ExpenseAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook for comprehensive expense analytics
 */
export function useExpenseAnalytics(
  options: UseExpenseAnalyticsOptions = {}
): UseExpenseAnalyticsReturn {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Memoize the options object to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => ({
      start_date: options.start_date,
      end_date: options.end_date,
      categories: options.categories,
    }),
    [options.start_date, options.end_date, options.categories]
  );

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const analyticsData = await ExpenseAnalyticsService.getExpenseAnalytics(
        user.id,
        memoizedOptions
      );

      setAnalytics(analyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(errorMessage);
      logger.logUnhandledError(err as Error, user.id, {
        context: "useExpenseAnalytics",
        options: memoizedOptions,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, memoizedOptions]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel("expense-analytics")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh analytics when expenses change
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchAnalytics]);

  // Optional refresh interval
  useEffect(() => {
    if (!options.refreshInterval) return;

    const interval = setInterval(fetchAnalytics, options.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, options.refreshInterval]);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
    lastUpdated,
  };
}

interface UseSpendingTrendsOptions {
  start_date?: string;
  end_date?: string;
  categories?: string[];
  groupBy?: "day" | "week" | "month";
}

interface UseSpendingTrendsReturn {
  trends: SpendingTrend[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for spending trends data
 */
export function useSpendingTrends(
  options: UseSpendingTrendsOptions = {}
): UseSpendingTrendsReturn {
  const { user } = useAuth();
  const [trends, setTrends] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the options object to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => ({
      start_date: options.start_date,
      end_date: options.end_date,
      categories: options.categories,
      groupBy: options.groupBy,
    }),
    [options.start_date, options.end_date, options.categories, options.groupBy]
  );

  const fetchTrends = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const trendsData = await ExpenseAnalyticsService.getSpendingTrends(
        user.id,
        memoizedOptions
      );

      setTrends(trendsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch spending trends";
      setError(errorMessage);
      logger.logUnhandledError(err as Error, user.id, {
        context: "useSpendingTrends",
        options: memoizedOptions,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, memoizedOptions]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    trends,
    loading,
    error,
    refresh: fetchTrends,
  };
}

interface UseCategoryAnalyticsOptions {
  start_date?: string;
  end_date?: string;
  categories?: string[];
}

interface UseCategoryAnalyticsReturn {
  categoryBreakdown: CategoryBreakdown[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for category-based analytics
 */
export function useCategoryAnalytics(
  options: UseCategoryAnalyticsOptions = {}
): UseCategoryAnalyticsReturn {
  const { user } = useAuth();
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    CategoryBreakdown[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the options object to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => ({
      start_date: options.start_date,
      end_date: options.end_date,
      categories: options.categories,
    }),
    [options.start_date, options.end_date, options.categories]
  );

  const fetchCategoryBreakdown = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const breakdown = await ExpenseAnalyticsService.getCategoryBreakdown(
        user.id,
        memoizedOptions
      );

      setCategoryBreakdown(breakdown);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch category analytics";
      setError(errorMessage);
      logger.logUnhandledError(err as Error, user.id, {
        context: "useCategoryAnalytics",
        options: memoizedOptions,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, memoizedOptions]);

  useEffect(() => {
    fetchCategoryBreakdown();
  }, [fetchCategoryBreakdown]);

  return {
    categoryBreakdown,
    loading,
    error,
    refresh: fetchCategoryBreakdown,
  };
}

interface UseExpenseSummaryOptions {
  start_date?: string;
  end_date?: string;
}

interface UseExpenseSummaryReturn {
  summary: ExpenseSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for expense summary data
 */
export function useExpenseSummary(
  options: UseExpenseSummaryOptions = {}
): UseExpenseSummaryReturn {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the options object to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => ({
      start_date: options.start_date,
      end_date: options.end_date,
    }),
    [options.start_date, options.end_date]
  );

  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const summaryData = await ExpenseAnalyticsService.getExpenseSummary(
        user.id,
        memoizedOptions
      );

      setSummary(summaryData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch expense summary";
      setError(errorMessage);
      logger.logUnhandledError(err as Error, user.id, {
        context: "useExpenseSummary",
        options: memoizedOptions,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, memoizedOptions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Set up real-time subscription for summary updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel("expense-summary")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
  };
}

interface UseBudgetVsActualOptions {
  start_date?: string;
  end_date?: string;
}

interface UseBudgetVsActualReturn {
  budgetVsActual: BudgetVsActual[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for budget vs actual comparison
 */
export function useBudgetVsActual(
  options: UseBudgetVsActualOptions = {}
): UseBudgetVsActualReturn {
  const { user } = useAuth();
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the options object to prevent unnecessary re-renders
  const memoizedOptions = useMemo(
    () => ({
      start_date: options.start_date,
      end_date: options.end_date,
    }),
    [options.start_date, options.end_date]
  );

  const fetchBudgetVsActual = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await ExpenseAnalyticsService.getBudgetVsActual(
        user.id,
        memoizedOptions
      );

      setBudgetVsActual(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch budget vs actual";
      setError(errorMessage);
      logger.logUnhandledError(err as Error, user.id, {
        context: "useBudgetVsActual",
        options: memoizedOptions,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, memoizedOptions]);

  useEffect(() => {
    fetchBudgetVsActual();
  }, [fetchBudgetVsActual]);

  return {
    budgetVsActual,
    loading,
    error,
    refresh: fetchBudgetVsActual,
  };
}
