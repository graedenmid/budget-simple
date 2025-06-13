import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { PayPeriodService } from "@/lib/services/pay-period-service";
import {
  PayPeriodHistoryFilters,
  PayPeriodHistoryResponse,
  ReconciliationData,
  ReconciliationSummary,
  HistoricalTrendData,
} from "@/lib/types/pay-periods";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling/logger";

interface UsePayPeriodHistoryOptions {
  autoRefresh?: boolean;
  initialFilters?: Partial<PayPeriodHistoryFilters>;
}

interface UsePayPeriodHistoryReturn {
  // Data
  historyData: PayPeriodHistoryResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshHistory: () => Promise<void>;
  updateFilters: (filters: Partial<PayPeriodHistoryFilters>) => void;
  clearError: () => void;

  // Current filters
  currentFilters: PayPeriodHistoryFilters;
}

export function usePayPeriodHistory(
  options: UsePayPeriodHistoryOptions = {}
): UsePayPeriodHistoryReturn {
  const { user } = useAuth();
  const { autoRefresh = true, initialFilters = {} } = options;

  // State
  const [historyData, setHistoryData] =
    useState<PayPeriodHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<PayPeriodHistoryFilters>(
    {
      user_id: user?.id || "",
      completed_only: true,
      date_range: "last_6_months",
      sort_by: "date",
      sort_order: "desc",
      limit: 50,
      offset: 0,
      ...initialFilters,
    }
  );

  // Service instance
  const payPeriodService = useMemo(() => new PayPeriodService(), []);
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setIsLoading(true);

      const filters: PayPeriodHistoryFilters = {
        ...currentFilters,
        user_id: user.id,
      };

      const data = await payPeriodService.getPayPeriodHistory(filters);
      setHistoryData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch pay period history";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "usePayPeriodHistory.fetchHistory",
        filters: currentFilters,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentFilters, payPeriodService]);

  // Refresh history
  const refreshHistory = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  // Update filters
  const updateFilters = useCallback(
    (newFilters: Partial<PayPeriodHistoryFilters>) => {
      setCurrentFilters((prev) => ({
        ...prev,
        ...newFilters,
        user_id: user?.id || "",
      }));
    },
    [user]
  );

  // Initial load and subscription
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  // Auto-refresh on pay period changes
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const channel = supabase
      .channel("pay_periods_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, user, supabase, fetchHistory]);

  return {
    historyData,
    isLoading,
    error,
    refreshHistory,
    updateFilters,
    clearError,
    currentFilters,
  };
}

interface UseReconciliationDataOptions {
  payPeriodId?: string;
  autoRefresh?: boolean;
}

interface UseReconciliationDataReturn {
  // Data
  reconciliationData: ReconciliationData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshReconciliation: () => Promise<void>;
  clearError: () => void;
}

export function useReconciliationData(
  options: UseReconciliationDataOptions = {}
): UseReconciliationDataReturn {
  const { user } = useAuth();
  const { payPeriodId, autoRefresh = true } = options;

  // State
  const [reconciliationData, setReconciliationData] =
    useState<ReconciliationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service instance
  const payPeriodService = useMemo(() => new PayPeriodService(), []);
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch reconciliation data
  const fetchReconciliation = useCallback(async () => {
    if (!user || !payPeriodId) return;

    try {
      setError(null);
      setIsLoading(true);

      const data = await payPeriodService.getReconciliationData(
        payPeriodId,
        user.id
      );
      setReconciliationData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch reconciliation data";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "useReconciliationData.fetchReconciliation",
        payPeriodId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, payPeriodId, payPeriodService]);

  // Refresh reconciliation
  const refreshReconciliation = useCallback(async () => {
    await fetchReconciliation();
  }, [fetchReconciliation]);

  // Initial load and subscription
  useEffect(() => {
    if (user && payPeriodId) {
      fetchReconciliation();
    }
  }, [user, payPeriodId, fetchReconciliation]);

  // Auto-refresh on allocation changes
  useEffect(() => {
    if (!autoRefresh || !user || !payPeriodId) return;

    const channel = supabase
      .channel("reconciliation_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        () => {
          fetchReconciliation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `id=eq.${payPeriodId}`,
        },
        () => {
          fetchReconciliation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, user, payPeriodId, supabase, fetchReconciliation]);

  return {
    reconciliationData,
    isLoading,
    error,
    refreshReconciliation,
    clearError,
  };
}

interface UseReconciliationSummaryOptions {
  dateFrom?: Date;
  dateTo?: Date;
  autoRefresh?: boolean;
}

interface UseReconciliationSummaryReturn {
  // Data
  summaryData: ReconciliationSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshSummary: () => Promise<void>;
  updateDateRange: (dateFrom?: Date, dateTo?: Date) => void;
  clearError: () => void;
}

export function useReconciliationSummary(
  options: UseReconciliationSummaryOptions = {}
): UseReconciliationSummaryReturn {
  const { user } = useAuth();
  const {
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
    autoRefresh = true,
  } = options;

  // State
  const [summaryData, setSummaryData] = useState<ReconciliationSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialDateFrom);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialDateTo);

  // Service instance
  const payPeriodService = useMemo(() => new PayPeriodService(), []);
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setIsLoading(true);

      const data = await payPeriodService.getReconciliationSummary(
        user.id,
        dateFrom,
        dateTo
      );
      setSummaryData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch reconciliation summary";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "useReconciliationSummary.fetchSummary",
        dateFrom,
        dateTo,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, dateFrom, dateTo, payPeriodService]);

  // Refresh summary
  const refreshSummary = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  // Update date range
  const updateDateRange = useCallback(
    (newDateFrom?: Date, newDateTo?: Date) => {
      setDateFrom(newDateFrom);
      setDateTo(newDateTo);
    },
    []
  );

  // Initial load and subscription
  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user, fetchSummary]);

  // Auto-refresh on pay period or allocation changes
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const channel = supabase
      .channel("reconciliation_summary_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSummary();
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
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, user, supabase, fetchSummary]);

  return {
    summaryData,
    isLoading,
    error,
    refreshSummary,
    updateDateRange,
    clearError,
  };
}

interface UseHistoricalTrendsOptions {
  dateFrom?: Date;
  dateTo?: Date;
  autoRefresh?: boolean;
}

interface UseHistoricalTrendsReturn {
  // Data
  trendsData: HistoricalTrendData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshTrends: () => Promise<void>;
  updateDateRange: (dateFrom?: Date, dateTo?: Date) => void;
  clearError: () => void;
}

export function useHistoricalTrends(
  options: UseHistoricalTrendsOptions = {}
): UseHistoricalTrendsReturn {
  const { user } = useAuth();
  const {
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
    autoRefresh = true,
  } = options;

  // State
  const [trendsData, setTrendsData] = useState<HistoricalTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialDateFrom);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialDateTo);

  // Service instance
  const payPeriodService = useMemo(() => new PayPeriodService(), []);
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch trends data
  const fetchTrends = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setIsLoading(true);

      const data = await payPeriodService.getHistoricalTrends(
        user.id,
        dateFrom,
        dateTo
      );
      setTrendsData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch historical trends";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "useHistoricalTrends.fetchTrends",
        dateFrom,
        dateTo,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, dateFrom, dateTo, payPeriodService]);

  // Refresh trends
  const refreshTrends = useCallback(async () => {
    await fetchTrends();
  }, [fetchTrends]);

  // Update date range
  const updateDateRange = useCallback(
    (newDateFrom?: Date, newDateTo?: Date) => {
      setDateFrom(newDateFrom);
      setDateTo(newDateTo);
    },
    []
  );

  // Initial load and subscription
  useEffect(() => {
    if (user) {
      fetchTrends();
    }
  }, [user, fetchTrends]);

  // Auto-refresh on pay period or allocation changes
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const channel = supabase
      .channel("historical_trends_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTrends();
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
          fetchTrends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, user, supabase, fetchTrends]);

  return {
    trendsData,
    isLoading,
    error,
    refreshTrends,
    updateDateRange,
    clearError,
  };
}
