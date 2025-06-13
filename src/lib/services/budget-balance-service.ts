import { createClient } from "@/lib/supabase/client";

// Simple database error handler
function handleDatabaseError(error: unknown, message: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${errorMessage}`);
}

// Budget balance calculation result
export interface BudgetBalance {
  pay_period_id: string;
  income_amount: number;
  total_allocated: number;
  total_spent: number;
  available_cash: number;
  utilization_percentage: number;
  last_updated: string;
}

// Budget health metrics
export interface BudgetHealth {
  score: number; // 0-100
  status: "excellent" | "good" | "warning" | "danger";
  indicators: {
    allocation_ratio: number; // % of income allocated
    spending_ratio: number; // % of allocations spent
    cash_buffer: number; // available cash amount
  };
}

// Budget balance summary
export interface BudgetBalanceSummary {
  balance: BudgetBalance;
  health: BudgetHealth;
  category_breakdown: Record<
    string,
    {
      allocated: number;
      spent: number;
      remaining: number;
      percentage: number;
    }
  >;
}

export class BudgetBalanceService {
  private supabase = createClient();

  /**
   * Calculate budget balance for a specific pay period
   */
  async calculateBudgetBalance(
    payPeriodId: string
  ): Promise<BudgetBalance | null> {
    try {
      // Get pay period details
      const { data: payPeriod, error: payPeriodError } = await this.supabase
        .from("pay_periods")
        .select("id, expected_net, actual_net")
        .eq("id", payPeriodId)
        .single();

      if (payPeriodError || !payPeriod) {
        throw handleDatabaseError(payPeriodError, "Failed to fetch pay period");
      }

      // Get allocation summary
      const { data: allocations, error: allocationsError } = await this.supabase
        .from("allocations")
        .select("expected_amount, actual_amount, status")
        .eq("pay_period_id", payPeriodId);

      if (allocationsError) {
        throw handleDatabaseError(
          allocationsError,
          "Failed to fetch allocations"
        );
      }

      // Get expenses for this pay period
      const { data: expenses, error: expensesError } = await this.supabase
        .from("expenses")
        .select("amount")
        .eq("pay_period_id", payPeriodId);

      if (expensesError) {
        throw handleDatabaseError(expensesError, "Failed to fetch expenses");
      }

      // Calculate totals
      const incomeAmount = payPeriod.actual_net || payPeriod.expected_net;
      const totalAllocated = (allocations || []).reduce(
        (sum, allocation) => sum + allocation.expected_amount,
        0
      );
      const totalSpent = (expenses || []).reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const availableCash = incomeAmount - totalAllocated - totalSpent;
      const utilizationPercentage =
        incomeAmount > 0 ? (totalAllocated / incomeAmount) * 100 : 0;

      return {
        pay_period_id: payPeriodId,
        income_amount: incomeAmount,
        total_allocated: totalAllocated,
        total_spent: totalSpent,
        available_cash: availableCash,
        utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      throw handleDatabaseError(error, "Failed to calculate budget balance");
    }
  }

  /**
   * Calculate budget health metrics
   */
  calculateBudgetHealth(balance: BudgetBalance): BudgetHealth {
    const {
      income_amount,
      total_allocated,
      available_cash,
      utilization_percentage,
    } = balance;

    // Calculate health indicators
    const allocationRatio = utilization_percentage;
    const spendingRatio =
      total_allocated > 0 ? (balance.total_spent / total_allocated) * 100 : 0;
    const cashBuffer = available_cash;

    // Calculate health score (0-100)
    let score = 100;

    // Deduct points for over-allocation
    if (allocationRatio > 100) {
      score -= Math.min(50, (allocationRatio - 100) * 2);
    } else if (allocationRatio > 90) {
      score -= (allocationRatio - 90) * 2;
    }

    // Deduct points for negative cash
    if (cashBuffer < 0) {
      const negativePercentage = (Math.abs(cashBuffer) / income_amount) * 100;
      score -= Math.min(30, negativePercentage);
    }

    // Bonus points for healthy cash buffer
    if (cashBuffer > 0 && allocationRatio < 90) {
      const bufferPercentage = (cashBuffer / income_amount) * 100;
      score += Math.min(10, bufferPercentage / 2);
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determine status based on score
    let status: BudgetHealth["status"];
    if (score >= 90) status = "excellent";
    else if (score >= 70) status = "good";
    else if (score >= 50) status = "warning";
    else status = "danger";

    return {
      score,
      status,
      indicators: {
        allocation_ratio: Math.round(allocationRatio * 100) / 100,
        spending_ratio: Math.round(spendingRatio * 100) / 100,
        cash_buffer: cashBuffer,
      },
    };
  }

  /**
   * Get comprehensive budget balance summary
   */
  async getBudgetBalanceSummary(
    payPeriodId: string
  ): Promise<BudgetBalanceSummary | null> {
    try {
      const balance = await this.calculateBudgetBalance(payPeriodId);
      if (!balance) return null;

      const health = this.calculateBudgetHealth(balance);

      // Get category breakdown
      const { data: allocationsWithCategories, error } = await this.supabase
        .from("allocations")
        .select(
          `
          expected_amount,
          actual_amount,
          budget_items!inner(category)
        `
        )
        .eq("pay_period_id", payPeriodId);

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch category breakdown");
      }

      // Calculate category breakdown
      const categoryBreakdown: Record<
        string,
        {
          allocated: number;
          spent: number;
          remaining: number;
          percentage: number;
        }
      > = {};

      (
        (allocationsWithCategories as unknown as {
          expected_amount: number;
          actual_amount: number;
          budget_items: { category: string };
        }[]) || []
      ).forEach((allocation) => {
        const category = allocation.budget_items.category;
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            allocated: 0,
            spent: 0,
            remaining: 0,
            percentage: 0,
          };
        }

        categoryBreakdown[category].allocated += allocation.expected_amount;
        categoryBreakdown[category].spent += allocation.actual_amount || 0;
      });

      // Calculate remaining and percentages
      Object.keys(categoryBreakdown).forEach((category) => {
        const categoryData = categoryBreakdown[category];
        categoryData.remaining = categoryData.allocated - categoryData.spent;
        categoryData.percentage =
          balance.total_allocated > 0
            ? Math.round(
                (categoryData.allocated / balance.total_allocated) * 10000
              ) / 100
            : 0;
      });

      return {
        balance,
        health,
        category_breakdown: categoryBreakdown,
      };
    } catch (error) {
      throw handleDatabaseError(error, "Failed to get budget balance summary");
    }
  }
}
