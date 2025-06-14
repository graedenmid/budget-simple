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
  const supabase = createClient();

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch pay periods - stable reference to prevent infinite loops
  const fetchPayPeriods = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      console.log("🔄 Fetching pay periods for user:", user.id);

      const payPeriodFilters: PayPeriodFilters = {
        user_id: user.id,
        ...filters,
      };

      console.time("⏱️ Pay periods fetch");

      // Use Promise.all to fetch data in parallel instead of sequentially
      const [periods, current, statistics] = await Promise.all([
        payPeriodService.getPayPeriods(payPeriodFilters),
        payPeriodService.getCurrentPayPeriod(user.id),
        payPeriodService.getPayPeriodStats(user.id),
      ]);

      console.timeEnd("⏱️ Pay periods fetch");
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
  }, [user?.id, JSON.stringify(filters), payPeriodService]); // Stable dependencies

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

  // Combined initial fetch and real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchPayPeriods();

    // Set up real-time subscription only if autoRefresh is enabled
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (autoRefresh) {
      console.log("🔄 Setting up realtime subscription for pay periods");
      try {
        channel = supabase
          .channel(`pay_periods:${user.id}`)
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
              // Use a timeout to debounce rapid changes
              setTimeout(() => {
                console.log("🔄 Refreshing pay periods due to realtime update");
                fetchPayPeriods();
              }, 1000); // Increased debounce time
            }
          )
          .subscribe((status) => {
            console.log("📡 Pay periods subscription status:", status);
            if (status === "SUBSCRIBED") {
              console.log("✅ Pay periods realtime subscription active");
            }
          });
      } catch (error) {
        console.warn("❌ Failed to set up realtime subscription:", error);
      }
    }

    // Cleanup function
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn("Failed to cleanup realtime subscription:", error);
        }
      }
    };
  }, [user, autoRefresh]); // Removed fetchPayPeriods from dependencies to prevent infinite loop

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
