import { createClient } from "@/lib/supabase/client";
import {
  ExpenseAnalytics,
  SpendingTrend,
  CategoryBreakdown,
  BudgetVsActual,
  MonthlyComparison,
  ExpenseSummary,
  ExpenseCategorySummary,
  MonthlyExpenseSummary,
} from "@/lib/types/expenses";

const supabase = createClient();

export class ExpenseAnalyticsService {
  /**
   * Get comprehensive expense analytics for a user
   */
  static async getExpenseAnalytics(
    userId: string,
    options: {
      start_date?: string;
      end_date?: string;
      categories?: string[];
    } = {}
  ): Promise<ExpenseAnalytics> {
    const { start_date, end_date, categories } = options;

    const [
      spending_trends,
      category_breakdown,
      budget_vs_actual,
      monthly_comparison,
    ] = await Promise.all([
      this.getSpendingTrends(userId, { start_date, end_date, categories }),
      this.getCategoryBreakdown(userId, { start_date, end_date, categories }),
      this.getBudgetVsActual(userId, { start_date, end_date }),
      this.getMonthlyComparison(userId, { start_date, end_date }),
    ]);

    return {
      spending_trends,
      category_breakdown,
      budget_vs_actual,
      monthly_comparison,
    };
  }

  /**
   * Get spending trends over time
   */
  static async getSpendingTrends(
    userId: string,
    options: {
      start_date?: string;
      end_date?: string;
      categories?: string[];
      groupBy?: "day" | "week" | "month";
    } = {}
  ): Promise<SpendingTrend[]> {
    const { start_date, end_date, categories, groupBy = "day" } = options;

    let query = supabase
      .from("expenses")
      .select("date, amount, category")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (start_date) {
      query = query.gte("date", start_date);
    }
    if (end_date) {
      query = query.lte("date", end_date);
    }
    if (categories && categories.length > 0) {
      query = query.in("category", categories);
    }

    const { data: expenses, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch spending trends: ${error.message}`);
    }

    if (!expenses) return [];

    // Group expenses by date and category
    const groupedData: Record<string, Record<string, number>> = {};

    expenses.forEach((expense) => {
      const dateKey = this.formatDateForGrouping(expense.date, groupBy);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {};
      }

      if (!groupedData[dateKey][expense.category]) {
        groupedData[dateKey][expense.category] = 0;
      }

      groupedData[dateKey][expense.category] += expense.amount;
    });

    // Convert to array format
    const trends: SpendingTrend[] = [];
    Object.entries(groupedData).forEach(([date, categories]) => {
      Object.entries(categories).forEach(([category, amount]) => {
        trends.push({
          date,
          amount,
          category,
        });
      });
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get category breakdown with percentages
   */
  static async getCategoryBreakdown(
    userId: string,
    options: {
      start_date?: string;
      end_date?: string;
      categories?: string[];
    } = {}
  ): Promise<CategoryBreakdown[]> {
    const { start_date, end_date, categories } = options;

    let query = supabase
      .from("expenses")
      .select("category, amount, budget_item_id")
      .eq("user_id", userId);

    if (start_date) {
      query = query.gte("date", start_date);
    }
    if (end_date) {
      query = query.lte("date", end_date);
    }
    if (categories && categories.length > 0) {
      query = query.in("category", categories);
    }

    const { data: expenses, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch category breakdown: ${error.message}`);
    }

    if (!expenses) return [];

    // Group by category
    const categoryTotals: Record<
      string,
      {
        amount: number;
        budget_allocated: number;
      }
    > = {};

    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = {
          amount: 0,
          budget_allocated: 0,
        };
      }
      categoryTotals[expense.category].amount += expense.amount;
    });

    // Get budget allocations for comparison
    const budgetAllocations = await this.getBudgetAllocationsForCategories(
      userId,
      Object.keys(categoryTotals),
      { start_date, end_date }
    );

    // Build category breakdown
    const breakdown: CategoryBreakdown[] = Object.entries(categoryTotals).map(
      ([category, data]) => {
        const percentage =
          totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0;
        const budget_allocated = budgetAllocations[category] || 0;
        const variance =
          budget_allocated > 0 ? data.amount - budget_allocated : undefined;

        return {
          category,
          amount: data.amount,
          percentage,
          budget_allocated: budget_allocated > 0 ? budget_allocated : undefined,
          variance,
        };
      }
    );

    return breakdown.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get budget vs actual spending comparison
   */
  static async getBudgetVsActual(
    userId: string,
    options?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<BudgetVsActual[]> {
    // TODO: Implement proper budget vs actual comparison
    // For now, acknowledge the parameters but return empty array
    console.warn(
      `getBudgetVsActual called for user ${userId} with options:`,
      options
    );
    console.warn(
      "This method is not yet implemented and will return empty data"
    );
    return [];
  }

  /**
   * Get monthly comparison data
   */
  static async getMonthlyComparison(
    userId: string,
    options: {
      start_date?: string;
      end_date?: string;
      months?: number; // Number of months to compare
    } = {}
  ): Promise<MonthlyComparison[]> {
    const { months = 6 } = options;

    // Calculate date range for the specified number of months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("date, amount")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch monthly comparison: ${error.message}`);
    }

    if (!expenses) return [];

    // Group by month
    const monthlyTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const monthKey = expense.date.substr(0, 7); // YYYY-MM format
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0;
      }
      monthlyTotals[monthKey] += expense.amount;
    });

    // Build comparison data
    const sortedMonths = Object.keys(monthlyTotals).sort();
    const comparisons: MonthlyComparison[] = [];

    for (let i = 1; i < sortedMonths.length; i++) {
      const currentMonth = sortedMonths[i];
      const previousMonth = sortedMonths[i - 1];
      const current_amount = monthlyTotals[currentMonth];
      const previous_amount = monthlyTotals[previousMonth];
      const change_amount = current_amount - previous_amount;
      const change_percentage =
        previous_amount > 0 ? (change_amount / previous_amount) * 100 : 0;

      comparisons.push({
        month: currentMonth,
        current_amount,
        previous_amount,
        change_amount,
        change_percentage,
      });
    }

    return comparisons;
  }

  /**
   * Get expense summary for a date range
   */
  static async getExpenseSummary(
    userId: string,
    options: {
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<ExpenseSummary> {
    const { start_date, end_date } = options;

    let query = supabase
      .from("expenses")
      .select("amount, category, type, date")
      .eq("user_id", userId);

    if (start_date) {
      query = query.gte("date", start_date);
    }
    if (end_date) {
      query = query.lte("date", end_date);
    }

    const { data: expenses, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expense summary: ${error.message}`);
    }

    if (!expenses) {
      return {
        total_expenses: 0,
        total_budget_payments: 0,
        total_amount: 0,
        expense_count: 0,
        categories: [],
        monthly_totals: [],
      };
    }

    // Calculate totals
    const total_amount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const total_expenses = expenses
      .filter((expense) => expense.type === "EXPENSE")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const total_budget_payments = expenses
      .filter((expense) => expense.type === "BUDGET_PAYMENT")
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Category breakdown
    const categoryTotals: Record<string, { amount: number; count: number }> =
      {};
    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = { amount: 0, count: 0 };
      }
      categoryTotals[expense.category].amount += expense.amount;
      categoryTotals[expense.category].count += 1;
    });

    const categories: ExpenseCategorySummary[] = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        total_amount: data.amount,
        expense_count: data.count,
        percentage: total_amount > 0 ? (data.amount / total_amount) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    // Monthly breakdown
    const monthlyTotals: Record<
      string,
      {
        total_amount: number;
        expense_count: number;
        budget_payments: number;
        general_expenses: number;
      }
    > = {};

    expenses.forEach((expense) => {
      const monthKey = expense.date.substr(0, 7); // YYYY-MM format
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = {
          total_amount: 0,
          expense_count: 0,
          budget_payments: 0,
          general_expenses: 0,
        };
      }

      monthlyTotals[monthKey].total_amount += expense.amount;
      monthlyTotals[monthKey].expense_count += 1;

      if (expense.type === "BUDGET_PAYMENT") {
        monthlyTotals[monthKey].budget_payments += expense.amount;
      } else {
        monthlyTotals[monthKey].general_expenses += expense.amount;
      }
    });

    const monthly_totals: MonthlyExpenseSummary[] = Object.entries(
      monthlyTotals
    )
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      total_expenses,
      total_budget_payments,
      total_amount,
      expense_count: expenses.length,
      categories,
      monthly_totals,
    };
  }

  /**
   * Helper: Get budget allocations for specific categories
   */
  private static async getBudgetAllocationsForCategories(
    userId: string,
    categories: string[],
    options?: { start_date?: string; end_date?: string }
  ): Promise<Record<string, number>> {
    // TODO: Implement proper budget allocation aggregation
    // For now, acknowledge the parameters but return empty object
    console.warn(`getBudgetAllocationsForCategories called for user ${userId}`);
    console.warn(`Categories requested: ${categories.join(", ")}`);
    console.warn(
      `Date range: ${options?.start_date || "none"} to ${
        options?.end_date || "none"
      }`
    );
    console.warn(
      "This method is not yet implemented and will return empty data"
    );
    return {};
  }

  /**
   * Helper: Format date for grouping
   */
  private static formatDateForGrouping(
    date: string,
    groupBy: "day" | "week" | "month"
  ): string {
    const d = new Date(date);

    switch (groupBy) {
      case "day":
        return date; // Already in YYYY-MM-DD format
      case "week":
        // Get Monday of the week
        const monday = new Date(d);
        monday.setDate(d.getDate() - d.getDay() + 1);
        return monday.toISOString().split("T")[0];
      case "month":
        return date.substr(0, 7); // YYYY-MM format
      default:
        return date;
    }
  }
}
