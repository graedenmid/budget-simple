import { createClient } from "@/lib/supabase/client";

// Budget item spending summary
export interface BudgetItemSpending {
  budget_item_id: string;
  budget_item_name: string;
  budget_item_category: string;
  expected_amount: number;
  actual_amount: number;
  remaining_amount: number;
  variance_amount: number;
  variance_percentage: number;
  expense_count: number;
  status: "under_budget" | "on_budget" | "over_budget";
}

// Pay period budget tracking summary
export interface PayPeriodBudgetTracking {
  pay_period_id: string;
  total_expected: number;
  total_actual_expenses: number;
  total_remaining: number;
  budget_items: BudgetItemSpending[];
}

export class BudgetTrackingService {
  private supabase = createClient();

  /**
   * Get budget item spending for a specific pay period
   */
  async getBudgetItemSpending(
    payPeriodId: string,
    userId?: string
  ): Promise<BudgetItemSpending[]> {
    if (!userId) {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();
      if (error || !user) return [];
      userId = user.id;
    }

    // Get all allocations for this pay period
    const { data: allocations, error: allocationsError } = await this.supabase
      .from("allocations")
      .select(
        `
        *,
        budget_items!inner(id, name, category, user_id)
      `
      )
      .eq("pay_period_id", payPeriodId)
      .eq("budget_items.user_id", userId);

    if (allocationsError) {
      console.error("Error fetching allocations:", allocationsError);
      return [];
    }

    // Get all expenses linked to budget items for this pay period
    const { data: expenses, error: expensesError } = await this.supabase
      .from("expenses")
      .select("*")
      .eq("pay_period_id", payPeriodId)
      .eq("user_id", userId)
      .eq("type", "BUDGET_PAYMENT")
      .not("budget_item_id", "is", null);

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      return [];
    }

    // Calculate spending for each budget item
    const spendingData: BudgetItemSpending[] = [];

    for (const allocation of allocations || []) {
      const budgetItem = allocation.budget_items;
      const relatedExpenses =
        expenses?.filter(
          (expense) => expense.budget_item_id === allocation.budget_item_id
        ) || [];

      const actualAmount = relatedExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const expectedAmount = allocation.expected_amount;
      const remainingAmount = expectedAmount - actualAmount;
      const varianceAmount = actualAmount - expectedAmount;
      const variancePercentage =
        expectedAmount > 0 ? (varianceAmount / expectedAmount) * 100 : 0;

      let status: "under_budget" | "on_budget" | "over_budget";
      if (actualAmount > expectedAmount * 1.05) {
        // 5% tolerance
        status = "over_budget";
      } else if (actualAmount < expectedAmount * 0.95) {
        // 5% tolerance
        status = "under_budget";
      } else {
        status = "on_budget";
      }

      spendingData.push({
        budget_item_id: allocation.budget_item_id,
        budget_item_name: budgetItem.name,
        budget_item_category: budgetItem.category,
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        remaining_amount: remainingAmount,
        variance_amount: varianceAmount,
        variance_percentage: variancePercentage,
        expense_count: relatedExpenses.length,
        status,
      });
    }

    return spendingData.sort((a, b) =>
      a.budget_item_name.localeCompare(b.budget_item_name)
    );
  }

  /**
   * Get complete budget tracking for a pay period
   */
  async getPayPeriodBudgetTracking(
    payPeriodId: string,
    userId?: string
  ): Promise<PayPeriodBudgetTracking | null> {
    const budgetItems = await this.getBudgetItemSpending(payPeriodId, userId);

    if (budgetItems.length === 0) {
      return null;
    }

    const totalExpected = budgetItems.reduce(
      (sum, item) => sum + item.expected_amount,
      0
    );
    const totalActualExpenses = budgetItems.reduce(
      (sum, item) => sum + item.actual_amount,
      0
    );
    const totalRemaining = totalExpected - totalActualExpenses;

    return {
      pay_period_id: payPeriodId,
      total_expected: totalExpected,
      total_actual_expenses: totalActualExpenses,
      total_remaining: totalRemaining,
      budget_items: budgetItems,
    };
  }

  /**
   * Get budget item spending across multiple pay periods
   */
  async getBudgetItemHistory(
    budgetItemId: string,
    userId?: string,
    limit: number = 6
  ): Promise<BudgetItemSpending[]> {
    if (!userId) {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();
      if (error || !user) return [];
      userId = user.id;
    }

    // Get recent pay periods for this user
    const { data: payPeriods, error: payPeriodsError } = await this.supabase
      .from("pay_periods")
      .select("id")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(limit);

    if (payPeriodsError || !payPeriods) {
      console.error("Error fetching pay periods:", payPeriodsError);
      return [];
    }

    // Get spending data for each pay period
    const historyData: BudgetItemSpending[] = [];

    for (const payPeriod of payPeriods) {
      const spendingData = await this.getBudgetItemSpending(
        payPeriod.id,
        userId
      );
      const budgetItemSpending = spendingData.find(
        (item) => item.budget_item_id === budgetItemId
      );

      if (budgetItemSpending) {
        historyData.push(budgetItemSpending);
      }
    }

    return historyData;
  }

  /**
   * Get summary statistics for a budget item
   */
  async getBudgetItemSummary(
    budgetItemId: string,
    userId?: string
  ): Promise<{
    totalExpenses: number;
    averageSpending: number;
    totalBudgeted: number;
    averageBudgeted: number;
    overBudgetCount: number;
    underBudgetCount: number;
    onBudgetCount: number;
  } | null> {
    const history = await this.getBudgetItemHistory(budgetItemId, userId, 12);

    if (history.length === 0) {
      return null;
    }

    const totalExpenses = history.reduce(
      (sum, item) => sum + item.actual_amount,
      0
    );
    const totalBudgeted = history.reduce(
      (sum, item) => sum + item.expected_amount,
      0
    );
    const overBudgetCount = history.filter(
      (item) => item.status === "over_budget"
    ).length;
    const underBudgetCount = history.filter(
      (item) => item.status === "under_budget"
    ).length;
    const onBudgetCount = history.filter(
      (item) => item.status === "on_budget"
    ).length;

    return {
      totalExpenses,
      averageSpending: totalExpenses / history.length,
      totalBudgeted,
      averageBudgeted: totalBudgeted / history.length,
      overBudgetCount,
      underBudgetCount,
      onBudgetCount,
    };
  }
}
