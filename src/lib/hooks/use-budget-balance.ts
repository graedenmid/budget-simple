import { useState, useEffect } from "react";
import { BudgetBalanceService } from "@/lib/services/budget-balance-service";
import { createClient } from "@/lib/supabase/client";
import type {
  BudgetBalance,
  BudgetHealth,
  BudgetBalanceSummary,
} from "@/lib/services/budget-balance-service";

// Initialize service instance
const budgetBalanceService = new BudgetBalanceService();

/**
 * Hook for managing budget balance state with real-time updates
 */
export function useBudgetBalance(payPeriodId: string | null) {
  const [balance, setBalance] = useState<BudgetBalance | null>(null);
  const [health, setHealth] = useState<BudgetHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payPeriodId) {
      setBalance(null);
      setHealth(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    async function fetchBudgetBalance() {
      try {
        setLoading(true);
        setError(null);

        const balanceData = await budgetBalanceService.calculateBudgetBalance(
          payPeriodId!
        );

        if (isMounted && balanceData) {
          const healthData =
            budgetBalanceService.calculateBudgetHealth(balanceData);
          setBalance(balanceData);
          setHealth(healthData);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch budget balance"
          );
          setBalance(null);
          setHealth(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchBudgetBalance();

    // Set up real-time subscription for allocations changes
    const subscription = supabase
      .channel(`budget-balance-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        () => {
          // Refetch budget balance when allocations change
          if (isMounted) {
            fetchBudgetBalance();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [payPeriodId]); // Only depend on payPeriodId

  return {
    balance,
    health,
    loading,
    error,
  };
}

/**
 * Hook for budget health only (lighter weight) with real-time updates
 */
export function useBudgetHealth(payPeriodId: string | null) {
  const [health, setHealth] = useState<BudgetHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payPeriodId) {
      setHealth(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    async function fetchBudgetHealth() {
      try {
        setLoading(true);
        setError(null);

        const balance = await budgetBalanceService.calculateBudgetBalance(
          payPeriodId!
        );

        if (isMounted && balance) {
          const healthData =
            budgetBalanceService.calculateBudgetHealth(balance);
          setHealth(healthData);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch budget health"
          );
          setHealth(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchBudgetHealth();

    // Set up real-time subscription for allocations changes
    const subscription = supabase
      .channel(`budget-health-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        () => {
          // Refetch budget health when allocations change
          if (isMounted) {
            fetchBudgetHealth();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [payPeriodId]); // Only depend on payPeriodId

  return {
    health,
    loading,
    error,
  };
}

/**
 * Hook for comprehensive budget summary with real-time updates
 */
export function useBudgetBalanceSummary(payPeriodId: string | null) {
  const [summary, setSummary] = useState<BudgetBalanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payPeriodId) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    async function fetchBudgetSummary() {
      try {
        setLoading(true);
        setError(null);

        const summaryData = await budgetBalanceService.getBudgetBalanceSummary(
          payPeriodId!
        );

        if (isMounted) {
          setSummary(summaryData);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch budget summary"
          );
          setSummary(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchBudgetSummary();

    // Set up real-time subscription for allocations changes
    const subscription = supabase
      .channel(`budget-summary-${payPeriodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `pay_period_id=eq.${payPeriodId}`,
        },
        () => {
          // Refetch budget summary when allocations change
          if (isMounted) {
            fetchBudgetSummary();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [payPeriodId]); // Only depend on payPeriodId

  return {
    summary,
    loading,
    error,
  };
}
