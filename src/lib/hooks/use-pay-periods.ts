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
  IncomeCadence,
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

  // Status management actions
  reactivatePayPeriod: (payPeriodId: string) => Promise<PayPeriod>;
  checkCanAutoComplete: (payPeriodId: string) => Promise<boolean>;
  validatePayPeriodEditable: (
    payPeriodId: string
  ) => Promise<{ canEdit: boolean; reason?: string }>;
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
  // Create a single Supabase client instance for the lifetime of this hook
  const supabase = useMemo(() => createClient(), []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize the serialized filters to prevent unnecessary re-renders
  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch pay periods - stable reference to prevent infinite loops
  const fetchPayPeriods = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      console.log("🔄 Fetching pay periods for user:", user.id);

      // Parse serialized filters to avoid object reference issues
      const parsedFilters = JSON.parse(serializedFilters);
      const payPeriodFilters: PayPeriodFilters = {
        user_id: user.id,
        ...parsedFilters,
      };

      // Use Promise.all to fetch data in parallel instead of sequentially
      const [periods, current, statistics] = await Promise.all([
        payPeriodService.getPayPeriods(payPeriodFilters),
        payPeriodService.getCurrentPayPeriod(user.id),
        payPeriodService.getPayPeriodStats(user.id),
      ]);

      console.log(
        `✅ Loaded ${periods.length} pay periods, current: ${
          current?.id || "none"
        }`
      );

      setPayPeriods(periods);
      setCurrentPayPeriod(current);
      setStats(statistics);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch pay periods";
      console.error("❌ Pay periods fetch failed:", err);
      setError(errorMessage);
      await logger.logUnhandledError(err as Error, user.id, {
        context: "usePayPeriods.fetchPayPeriods",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, serializedFilters, payPeriodService]);

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

        // Update the pay period in our state
        setPayPeriods((prev) =>
          prev.map((p) => (p.id === payPeriodId ? updatedPayPeriod : p))
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

        // Update the pay period in our state
        setPayPeriods((prev) =>
          prev.map((p) => (p.id === payPeriodId ? completedPayPeriod : p))
        );

        // Update current pay period if it's the one being completed
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(completedPayPeriod);
        }

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

        // Remove the pay period from our state
        setPayPeriods((prev) => prev.filter((p) => p.id !== payPeriodId));

        // Clear current pay period if it's the one being deleted
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(null);
        }
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

  // Reactivate pay period
  const reactivatePayPeriod = useCallback(
    async (payPeriodId: string): Promise<PayPeriod> => {
      if (!user) throw new Error("User not authenticated");

      try {
        setIsUpdating(true);
        setError(null);

        const reactivatedPayPeriod = await payPeriodService.reactivatePayPeriod(
          payPeriodId,
          user.id
        );

        // Update the pay period in our state
        setPayPeriods((prev) =>
          prev.map((p) => (p.id === payPeriodId ? reactivatedPayPeriod : p))
        );

        // Update current pay period if it's the one being reactivated
        if (currentPayPeriod?.id === payPeriodId) {
          setCurrentPayPeriod(reactivatedPayPeriod);
        }

        return reactivatedPayPeriod;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to reactivate pay period";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.reactivatePayPeriod",
          payPeriodId,
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, payPeriodService, currentPayPeriod]
  );

  // Check if pay period can auto-complete
  const checkCanAutoComplete = useCallback(
    async (payPeriodId: string): Promise<boolean> => {
      try {
        setError(null);
        return await payPeriodService.canAutoComplete(payPeriodId);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to check can auto complete";
        setError(errorMessage);
        if (user) {
          await logger.logUnhandledError(err as Error, user.id, {
            context: "usePayPeriods.checkCanAutoComplete",
            payPeriodId,
          });
        }
        return false;
      }
    },
    [user, payPeriodService]
  );

  // Validate if pay period is editable
  const validatePayPeriodEditable = useCallback(
    async (
      payPeriodId: string
    ): Promise<{ canEdit: boolean; reason?: string }> => {
      if (!user) return { canEdit: false, reason: "User not authenticated" };

      try {
        setError(null);
        return await payPeriodService.validatePayPeriodEditable(
          payPeriodId,
          user.id
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to validate pay period editable";
        setError(errorMessage);
        await logger.logUnhandledError(err as Error, user.id, {
          context: "usePayPeriods.validatePayPeriodEditable",
          payPeriodId,
        });
        return { canEdit: false, reason: errorMessage };
      }
    },
    [user, payPeriodService]
  );

  // Initial data fetch effect
  useEffect(() => {
    if (user) {
      fetchPayPeriods();
    }
  }, [user, fetchPayPeriods]);

  // *** NEW EFFECT: Auto-generate a pay period when none exist ***
  useEffect(() => {
    // Only attempt generation when:
    // 1. A user is authenticated
    // 2. We are not currently loading or generating
    // 3. No pay periods are present in state
    if (!user || isLoading || isGenerating || payPeriods.length > 0) {
      return;
    }

    const generateForActiveIncomeSources = async () => {
      try {
        // Fetch all active income sources for the user
        const { data: incomeSources, error } = await supabase
          .from("income_sources")
          .select("id, cadence, start_date, net_amount")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (error) {
          console.error(
            "Failed to fetch income sources for pay period generation:",
            error
          );
          return;
        }

        if (!incomeSources || incomeSources.length === 0) {
          // Nothing to generate if user has no active income sources
          return;
        }

        // Generate a pay period for each active income source
        for (const income of incomeSources) {
          await generateNextPayPeriod({
            income_source_id: income.id as string,
            user_id: user.id,
            cadence: income.cadence as IncomeCadence,
            start_date: new Date(income.start_date as string),
            expected_net: income.net_amount as number,
          });
        }
      } catch (err) {
        console.error("Automatic pay period generation failed:", err);
      }
    };

    generateForActiveIncomeSources();
    // We intentionally omit generateNextPayPeriod from deps to avoid re-running while it mutates state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, payPeriods, isLoading, isGenerating, supabase]);

  // Real-time subscription effect
  useEffect(() => {
    if (!user || !autoRefresh) {
      return;
    }

    console.log("🔄 Setting up realtime subscription for pay periods");
    const channelId = `pay_periods:${user.id}:${Math.random()
      .toString(36)
      .slice(2)}`;
    const channel = supabase.channel(channelId);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pay_periods",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Pay periods realtime update:", payload);
          refreshPayPeriods();
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Pay periods subscription status: ${status}`);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || err) {
          setError(
            `Realtime connection failed: ${
              err?.message || status
            }. Some updates may be missed.`
          );
          console.error("❌ Realtime subscription failed:", err || status);
        }
      });

    // Cleanup function
    return () => {
      console.log(`🧹 Cleaning up realtime subscription: ${channelId}`);
      channel.unsubscribe().catch((error) => {
        console.warn("Failed to unsubscribe from realtime channel:", error);
      });
    };
  }, [user, autoRefresh, supabase, refreshPayPeriods]);

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

    // Status management actions
    reactivatePayPeriod,
    checkCanAutoComplete,
    validatePayPeriodEditable,
  };
}

/**
 * Simplified hook for getting just the current pay period
 */
export function useCurrentPayPeriod() {
  const { currentPayPeriod, isLoading, error, refreshPayPeriods } =
    usePayPeriods({
      autoRefresh: true,
    });

  return {
    currentPayPeriod,
    isLoading,
    error,
    refresh: refreshPayPeriods,
  };
}

/**
 * Hook for pay period generation operations
 */
export function usePayPeriodGeneration() {
  const { generateNextPayPeriod, isGenerating, error, clearError } =
    usePayPeriods({
      autoRefresh: false,
    });

  return {
    generateNextPayPeriod,
    isGenerating,
    error,
    clearError,
  };
}

/**
 * Hook for pay period management operations
 */
export function usePayPeriodOperations() {
  const {
    updatePayPeriod,
    completePayPeriod,
    deletePayPeriod,
    isUpdating,
    error,
    clearError,
    refreshPayPeriods,
  } = usePayPeriods({
    autoRefresh: true,
  });

  return {
    updatePayPeriod,
    completePayPeriod,
    deletePayPeriod,
    isUpdating,
    error,
    clearError,
    refresh: refreshPayPeriods,
  };
}
