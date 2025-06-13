import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { AllocationService } from "@/lib/services/allocation-service";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling";
import type {
  Allocation,
  AllocationWithDetails,
  AllocationSummary,
  AllocationCalculationRequest,
  AllocationCalculationResponse,
  AllocationValidationResult,
} from "@/lib/types/allocations";

const allocationService = new AllocationService();

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
 * Hook for managing allocations for a specific pay period
 */
export function useAllocationsForPayPeriod(payPeriodId: string | null) {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<AllocationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AllocationSummary | null>(null);

  const supabase = createClient();

  // Load allocations for pay period
  const loadAllocations = useCallback(async () => {
    if (!payPeriodId || !user) {
      setAllocations([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [allocationsData, summaryData] = await Promise.all([
        allocationService.getAllocationsForPayPeriod(payPeriodId, true),
        allocationService.getAllocationSummary(payPeriodId),
      ]);

      setAllocations(allocationsData);
      setSummary(summaryData);
    } catch (err) {
      const errorMessage = "Failed to load allocations";
      setError(errorMessage);
      logError(err, errorMessage, { payPeriodId, userId: user.id });
    } finally {
      setLoading(false);
    }
  }, [payPeriodId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!payPeriodId || !user) return;

    const subscription = supabase
      .channel(`allocations-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        (payload) => {
          console.log("Allocation change:", payload);
          loadAllocations(); // Reload data on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [payPeriodId, user, loadAllocations, supabase]);

  // Initial load
  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  return {
    allocations,
    summary,
    loading,
    error,
    refetch: loadAllocations,
  };
}

/**
 * Hook for allocation calculation and generation
 */
export function useAllocationCalculation() {
  const { user } = useAuth();
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] =
    useState<AllocationCalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate allocations without saving
  const calculateAllocations = useCallback(
    async (
      request: AllocationCalculationRequest
    ): Promise<AllocationCalculationResponse | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setCalculating(true);
        setError(null);

        const result = await allocationService.calculateAllocations(request);
        setCalculationResult(result);
        return result;
      } catch (err) {
        const errorMessage = "Failed to calculate allocations";
        setError(errorMessage);
        logError(err, errorMessage, {
          payPeriodId: request.pay_period_id,
          userId: user.id,
        });
        return null;
      } finally {
        setCalculating(false);
      }
    },
    [user]
  );

  // Generate and save allocations
  const generateAllocations = useCallback(
    async (
      request: AllocationCalculationRequest
    ): Promise<Allocation[] | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setCalculating(true);
        setError(null);

        const result = await allocationService.generateAllocationsForPayPeriod(
          request
        );
        return result;
      } catch (err) {
        const errorMessage = "Failed to generate allocations";
        setError(errorMessage);
        logError(err, errorMessage, {
          payPeriodId: request.pay_period_id,
          userId: user.id,
        });
        return null;
      } finally {
        setCalculating(false);
      }
    },
    [user]
  );

  return {
    calculating,
    calculationResult,
    error,
    calculateAllocations,
    generateAllocations,
    clearResult: () => {
      setCalculationResult(null);
      setError(null);
    },
  };
}

/**
 * Hook for individual allocation operations
 */
export function useAllocationOperations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mark allocation as paid
  const markAsPaid = useCallback(
    async (
      allocationId: string,
      actualAmount?: number
    ): Promise<Allocation | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await allocationService.markAllocationAsPaid(
          allocationId,
          actualAmount,
          user.id
        );
        return result;
      } catch (err) {
        const errorMessage = "Failed to mark allocation as paid";
        setError(errorMessage);
        logError(err, errorMessage, { allocationId, userId: user.id });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Mark allocation as unpaid
  const markAsUnpaid = useCallback(
    async (allocationId: string): Promise<Allocation | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await allocationService.markAllocationAsUnpaid(
          allocationId,
          user.id
        );
        return result;
      } catch (err) {
        const errorMessage = "Failed to mark allocation as unpaid";
        setError(errorMessage);
        logError(err, errorMessage, { allocationId, userId: user.id });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Update allocation amount
  const updateActualAmount = useCallback(
    async (
      allocationId: string,
      actualAmount: number
    ): Promise<Allocation | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await allocationService.updateAllocation(allocationId, {
          actual_amount: actualAmount,
          updated_at: new Date().toISOString(),
        });
        return result;
      } catch (err) {
        const errorMessage = "Failed to update allocation amount";
        setError(errorMessage);
        logError(err, errorMessage, { allocationId, userId: user.id });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Delete allocation
  const deleteAllocation = useCallback(
    async (allocationId: string): Promise<boolean> => {
      if (!user) {
        setError("User not authenticated");
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        await allocationService.deleteAllocation(allocationId);
        return true;
      } catch (err) {
        const errorMessage = "Failed to delete allocation";
        setError(errorMessage);
        logError(err, errorMessage, { allocationId, userId: user.id });
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
    markAsPaid,
    markAsUnpaid,
    updateActualAmount,
    deleteAllocation,
    clearError: () => setError(null),
  };
}

/**
 * Hook for allocation validation
 */
export function useAllocationValidation() {
  const { user } = useAuth();
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<AllocationValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate allocations for a pay period
  const validateAllocations = useCallback(
    async (payPeriodId: string): Promise<AllocationValidationResult | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setValidating(true);
        setError(null);

        const result = await allocationService.validateAllocations(payPeriodId);
        setValidationResult(result);
        return result;
      } catch (err) {
        const errorMessage = "Failed to validate allocations";
        setError(errorMessage);
        logError(err, errorMessage, { payPeriodId, userId: user.id });
        return null;
      } finally {
        setValidating(false);
      }
    },
    [user]
  );

  return {
    validating,
    validationResult,
    error,
    validateAllocations,
    clearResult: () => {
      setValidationResult(null);
      setError(null);
    },
  };
}

/**
 * Hook for allocation history and reporting
 */
export function useAllocationHistory() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<AllocationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Load allocation history
  const loadHistory = useCallback(
    async (limit = 50, offset = 0, append = false): Promise<void> => {
      if (!user) {
        setError("User not authenticated");
        return;
      }

      try {
        setLoading(true);
        if (!append) {
          setError(null);
        }

        const result = await allocationService.getAllocationsForUser(
          user.id,
          limit,
          offset
        );

        if (append) {
          setAllocations((prev) => [...prev, ...result]);
        } else {
          setAllocations(result);
        }

        setHasMore(result.length === limit);
      } catch (err) {
        const errorMessage = "Failed to load allocation history";
        setError(errorMessage);
        logError(err, errorMessage, { userId: user.id, limit, offset });
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Load more allocations (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return;
    await loadHistory(50, allocations.length, true);
  }, [hasMore, loading, allocations.length, loadHistory]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  return {
    allocations,
    loading,
    error,
    hasMore,
    loadHistory,
    loadMore,
    clearError: () => setError(null),
  };
}
