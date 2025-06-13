import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { PayPeriodService } from "@/lib/services/pay-period-service";
import {
  PayPeriod,
  PayPeriodWithDetails,
  PayPeriodFilters,
  PayPeriodGenerationConfig,
  PayPeriodGenerationResult,
  PayPeriodStats,
} from "@/lib/types/pay-periods";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling/logger";

interface UsePayPeriodsOptions {
  autoRefresh?: boolean;
  filters?: Partial<PayPeriodFilters>;
}

interface UsePayPeriodsReturn {
  // Data
  payPeriods: PayPeriod[];
  currentPayPeriod: PayPeriod | null;
  stats: PayPeriodStats | null;

  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  isUpdating: boolean;

  // Error state
  error: string | null;

  // Actions
  refreshPayPeriods: () => Promise<void>;
  generateNextPayPeriod: (
    config: PayPeriodGenerationConfig
  ) => Promise<PayPeriodGenerationResult>;
  getPayPeriodWithDetails: (
    payPeriodId: string
  ) => Promise<PayPeriodWithDetails | null>;
  updatePayPeriod: (
    payPeriodId: string,
    updates: Partial<PayPeriod>
  ) => Promise<PayPeriod>;
  completePayPeriod: (
    payPeriodId: string,
    actualNet?: number
  ) => Promise<PayPeriod>;
  deletePayPeriod: (payPeriodId: string) => Promise<void>;
  clearError: () => void;
}

export function usePayPeriods(
  options: UsePayPeriodsOptions = {}
): UsePayPeriodsReturn {
  const { user } = useAuth();
  const { autoRefresh = true, filters = {} } = options;

  // State
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [currentPayPeriod, setCurrentPayPeriod] = useState<PayPeriod | null>(
    null
  );
  const [stats, setStats] = useState<PayPeriodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service instance - memoized to prevent recreation on every render
  const payPeriodService = useMemo(() => new PayPeriodService(), []);
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch pay periods
  const fetchPayPeriods = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      const payPeriodFilters: PayPeriodFilters = {
        user_id: user.id,
        ...filters,
      };

      const periods = await payPeriodService.getPayPeriods(payPeriodFilters);
      setPayPeriods(periods);

      // Get current active pay period
      const current = await payPeriodService.getCurrentPayPeriod(user.id);
      setCurrentPayPeriod(current);

      // Get statistics
      const statistics = await payPeriodService.getPayPeriodStats(user.id);
      setStats(statistics);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch pay periods";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "usePayPeriods.fetchPayPeriods",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, payPeriodService]);

  // Refresh pay periods
  const refreshPayPeriods = useCallback(async () => {
    setIsLoading(true);
    await fetchPayPeriods();
  }, [fetchPayPeriods]);

  // Generate next pay period
  const generateNextPayPeriod = useCallback(
    async (
      config: PayPeriodGenerationConfig
    ): Promise<PayPeriodGenerationResult> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      try {
        setIsGenerating(true);
        setError(null);

        const result = await payPeriodService.generateNextPayPeriod(config);

        if (result.success) {
          // Refresh the list to include the new pay period
          await fetchPayPeriods();
        } else {
          setError(result.error || "Failed to generate pay period");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate pay period";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.generateNextPayPeriod",
          config,
        });
        return { success: false, error: errorMessage };
      } finally {
        setIsGenerating(false);
      }
    },
    [user, payPeriodService, fetchPayPeriods]
  );

  // Get pay period with details
  const getPayPeriodWithDetails = useCallback(
    async (payPeriodId: string): Promise<PayPeriodWithDetails | null> => {
      if (!user) return null;

      try {
        setError(null);
        return await payPeriodService.getPayPeriodWithDetails(
          payPeriodId,
          user.id
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch pay period details";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.getPayPeriodWithDetails",
          payPeriodId,
        });
        return null;
      }
    },
    [user, payPeriodService]
  );

  // Update pay period
  const updatePayPeriod = useCallback(
    async (
      payPeriodId: string,
      updates: Partial<PayPeriod>
    ): Promise<PayPeriod> => {
      if (!user) throw new Error("User not authenticated");

      try {
        setIsUpdating(true);
        setError(null);

        const updatedPayPeriod = await payPeriodService.updatePayPeriod(
          payPeriodId,
          user.id,
          updates
        );

        // Update local state
        setPayPeriods((prev) =>
          prev.map((period) =>
            period.id === payPeriodId ? updatedPayPeriod : period
          )
        );

        // Update current pay period if it's the one being updated
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(updatedPayPeriod);
        }

        return updatedPayPeriod;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update pay period";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.updatePayPeriod",
          payPeriodId,
          updates,
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, payPeriodService, currentPayPeriod]
  );

  // Complete pay period
  const completePayPeriod = useCallback(
    async (payPeriodId: string, actualNet?: number): Promise<PayPeriod> => {
      if (!user) throw new Error("User not authenticated");

      try {
        setIsUpdating(true);
        setError(null);

        const completedPayPeriod = await payPeriodService.completePayPeriod(
          payPeriodId,
          user.id,
          actualNet
        );

        // Update local state
        setPayPeriods((prev) =>
          prev.map((period) =>
            period.id === payPeriodId ? completedPayPeriod : period
          )
        );

        // If this was the current pay period, clear it
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(null);
        }

        // Refresh stats
        const statistics = await payPeriodService.getPayPeriodStats(user.id);
        setStats(statistics);

        return completedPayPeriod;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to complete pay period";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.completePayPeriod",
          payPeriodId,
          actualNet,
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, payPeriodService, currentPayPeriod]
  );

  // Delete pay period
  const deletePayPeriod = useCallback(
    async (payPeriodId: string): Promise<void> => {
      if (!user) throw new Error("User not authenticated");

      try {
        setIsUpdating(true);
        setError(null);

        await payPeriodService.deletePayPeriod(payPeriodId, user.id);

        // Update local state
        setPayPeriods((prev) =>
          prev.filter((period) => period.id !== payPeriodId)
        );

        // If this was the current pay period, clear it
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(null);
        }

        // Refresh stats
        const statistics = await payPeriodService.getPayPeriodStats(user.id);
        setStats(statistics);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete pay period";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.deletePayPeriod",
          payPeriodId,
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, payPeriodService, currentPayPeriod]
  );

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !autoRefresh) return;

    const subscription = supabase
      .channel("pay_periods_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refresh data when changes occur
          await fetchPayPeriods();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, autoRefresh, fetchPayPeriods, supabase]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchPayPeriods();
    }
  }, [user, fetchPayPeriods]);

  return {
    // Data
    payPeriods,
    currentPayPeriod,
    stats,

    // Loading states
    isLoading,
    isGenerating,
    isUpdating,

    // Error state
    error,

    // Actions
    refreshPayPeriods,
    generateNextPayPeriod,
    getPayPeriodWithDetails,
    updatePayPeriod,
    completePayPeriod,
    deletePayPeriod,
    clearError,
  };
}

// Specialized hook for current pay period only
export function useCurrentPayPeriod() {
  const { user } = useAuth();
  const [currentPayPeriod, setCurrentPayPeriod] = useState<PayPeriod | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const payPeriodService = useMemo(() => new PayPeriodService(), []);

  const fetchCurrentPayPeriod = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const current = await payPeriodService.getCurrentPayPeriod(user.id);
      setCurrentPayPeriod(current);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch current pay period";
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "useCurrentPayPeriod.fetchCurrentPayPeriod",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, payPeriodService]);

  useEffect(() => {
    if (user) {
      fetchCurrentPayPeriod();
    }
  }, [user, fetchCurrentPayPeriod]);

  return {
    currentPayPeriod,
    isLoading,
    error,
    refetch: fetchCurrentPayPeriod,
  };
}
