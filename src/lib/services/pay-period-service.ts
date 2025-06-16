import { createClient } from "@/lib/supabase/client";
import {
  PayPeriod,
  PayPeriodInsert,
  PayPeriodUpdate,
  PayPeriodWithDetails,
  PayPeriodFilters,
  PayPeriodGenerationResult,
  PayPeriodGenerationConfig,
  PayPeriodStats,
  PayPeriodHistoryItem,
  PayPeriodHistoryFilters,
  PayPeriodHistoryResponse,
  ReconciliationData,
  ReconciliationAllocation,
  ReconciliationSummary,
  HistoricalTrendData,
  VARIANCE_THRESHOLDS,
} from "@/lib/types/pay-periods";
import {
  calculateFirstPayPeriod,
  calculateNextPayPeriod,
  validatePayPeriod,
} from "@/lib/utils/pay-period-calculations";

import { logger } from "@/lib/error-handling/logger";
import type { BudgetItem, IncomeSource } from "@/types/database";

// Simple database error handler
function handleDatabaseError(error: unknown, message: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${errorMessage}`);
}

// Compatibility wrapper for logError
async function logError(
  error: Error,
  context: { context: string; [key: string]: unknown }
): Promise<void> {
  const userId = context.userId as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _userId, ...otherContext } = context;
  await logger.logUnhandledError(error, userId, otherContext);
}

export class PayPeriodService {
  private supabase = createClient();

  /**
   * Get pay periods with optional filtering
   */
  async getPayPeriods(filters: PayPeriodFilters): Promise<PayPeriod[]> {
    try {
      let query = this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", filters.user_id)
        .order("start_date", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.income_source_id) {
        query = query.eq("income_source_id", filters.income_source_id);
      }

      if (filters.start_date_from) {
        query = query.gte("start_date", filters.start_date_from.toISOString());
      }

      if (filters.start_date_to) {
        query = query.lte("start_date", filters.start_date_to.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch pay periods");
      }

      return data || [];
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getPayPeriods",
        filters,
      });
      throw error;
    }
  }

  /**
   * Get a single pay period with detailed information
   */
  async getPayPeriodWithDetails(
    payPeriodId: string,
    userId: string
  ): Promise<PayPeriodWithDetails | null> {
    try {
      const { data: payPeriod, error: payPeriodError } = await this.supabase
        .from("pay_periods")
        .select(
          `
          *,
          income_source:income_sources!pay_periods_income_source_id_fkey(
            id, name, cadence, gross_amount, net_amount
          )
        `
        )
        .eq("id", payPeriodId)
        .eq("user_id", userId)
        .single();

      if (payPeriodError) {
        throw handleDatabaseError(
          payPeriodError,
          "Failed to fetch pay period details"
        );
      }

      if (!payPeriod) {
        return null;
      }

      // Fetch allocations for this pay period
      const { data: allocations, error: allocationsError } = await this.supabase
        .from("allocations")
        .select(
          `
          *,
          budget_item:budget_items!allocations_budget_item_id_fkey(
            id, name, category
          )
        `
        )
        .eq("pay_period_id", payPeriodId);

      if (allocationsError) {
        throw handleDatabaseError(
          allocationsError,
          "Failed to fetch allocations"
        );
      }

      // Calculate totals
      const totalExpectedAllocations =
        allocations?.reduce(
          (sum, allocation) => sum + allocation.expected_amount,
          0
        ) || 0;
      const totalActualAllocations =
        allocations?.reduce(
          (sum, allocation) => sum + (allocation.actual_amount || 0),
          0
        ) || 0;
      const remainingAmount = payPeriod.expected_net - totalActualAllocations;

      const result: PayPeriodWithDetails = {
        ...payPeriod,
        income_source: payPeriod.income_source as
          | {
              id: string;
              name: string;
              cadence: string;
              gross_amount: number;
              net_amount: number;
            }
          | undefined,
        allocations:
          allocations?.map((allocation) => ({
            id: allocation.id,
            budget_item_id: allocation.budget_item_id,
            budget_item_name: allocation.budget_item?.name || "Unknown",
            budget_item_category: allocation.budget_item?.category || "Other",
            expected_amount: allocation.expected_amount,
            actual_amount: allocation.actual_amount,
            status: allocation.status,
          })) || [],
        total_expected_allocations: totalExpectedAllocations,
        total_actual_allocations: totalActualAllocations,
        remaining_amount: remainingAmount,
      };

      return result;
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getPayPeriodWithDetails",
        payPeriodId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create a new pay period
   */
  async createPayPeriod(payPeriodData: PayPeriodInsert): Promise<PayPeriod> {
    try {
      // Validate the pay period data
      const validation = validatePayPeriod(
        new Date(payPeriodData.start_date),
        new Date(payPeriodData.end_date),
        "monthly", // We'll get the actual cadence from the income source
        payPeriodData.expected_net
      );

      if (!validation.is_valid) {
        throw new Error(
          `Invalid pay period data: ${validation.errors.join(", ")}`
        );
      }

      const { data, error } = await this.supabase
        .from("pay_periods")
        .insert(payPeriodData)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to create pay period");
      }

      return data;
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.createPayPeriod",
        payPeriodData,
      });
      throw error;
    }
  }

  /**
   * Update an existing pay period
   */
  async updatePayPeriod(
    payPeriodId: string,
    userId: string,
    updates: PayPeriodUpdate
  ): Promise<PayPeriod> {
    try {
      const { data, error } = await this.supabase
        .from("pay_periods")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payPeriodId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to update pay period");
      }

      return data;
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.updatePayPeriod",
        payPeriodId,
        userId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete a pay period
   */
  async deletePayPeriod(payPeriodId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("pay_periods")
        .delete()
        .eq("id", payPeriodId)
        .eq("user_id", userId);

      if (error) {
        throw handleDatabaseError(error, "Failed to delete pay period");
      }
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.deletePayPeriod",
        payPeriodId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate the next pay period automatically
   */
  async generateNextPayPeriod(
    config: PayPeriodGenerationConfig
  ): Promise<PayPeriodGenerationResult> {
    try {
      // Get the income source to validate it's active
      const { data: incomeSource, error: incomeError } = await this.supabase
        .from("income_sources")
        .select("*")
        .eq("id", config.income_source_id)
        .eq("user_id", config.user_id)
        .eq("is_active", true)
        .single();

      if (incomeError || !incomeSource) {
        return {
          success: false,
          error: "Income source not found or inactive",
        };
      }

      // Get the latest pay period for this income source
      const { data: latestPeriod } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("income_source_id", config.income_source_id)
        .eq("user_id", config.user_id)
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      let calculation;

      if (latestPeriod) {
        // Calculate next period based on the last one
        calculation = calculateNextPayPeriod(
          config.cadence,
          new Date(latestPeriod.end_date),
          config.expected_net
        );
      } else {
        // Calculate first period
        calculation = calculateFirstPayPeriod(
          config.cadence,
          config.start_date,
          config.expected_net
        );
      }

      // Create the new pay period
      const newPayPeriod = await this.createPayPeriod({
        user_id: config.user_id,
        income_source_id: config.income_source_id,
        start_date: calculation.start_date.toISOString().split("T")[0],
        end_date: calculation.end_date.toISOString().split("T")[0],
        expected_net: calculation.expected_net,
        status: "ACTIVE",
      });

      // After creating the pay period, automatically generate allocations
      try {
        // Fetch active budget items for the user
        const { data: budgetItems, error: budgetError } = await this.supabase
          .from("budget_items")
          .select("*")
          .eq("user_id", config.user_id)
          .eq("is_active", true);

        if (budgetError) {
          throw new Error(
            `Failed to fetch budget items: ${budgetError.message}`
          );
        }

        if (budgetItems && budgetItems.length > 0) {
          // Lazily import AllocationService to avoid circular dependencies at top level
          const { AllocationService } = await import("./allocation-service");
          const allocationService = new AllocationService();

          await allocationService.generateAllocationsForPayPeriod({
            pay_period_id: newPayPeriod.id,
            budget_items: budgetItems as unknown as BudgetItem[],
            income_source: incomeSource as unknown as IncomeSource,
          });
        }
      } catch (allocError) {
        // Allocation generation failures should not block pay period creation
        console.error("Automatic allocation generation failed:", allocError);
        await logError(allocError as Error, {
          context: "PayPeriodService.generateNextPayPeriod.autoAllocation",
          payPeriodId: newPayPeriod.id,
          userId: config.user_id,
        });
      }

      return {
        success: true,
        pay_period: newPayPeriod,
        message: "Pay period generated successfully",
      };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.generateNextPayPeriod",
        config,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate pay period",
      };
    }
  }

  /**
   * Get current active pay period for a user
   */
  async getCurrentPayPeriod(userId: string): Promise<PayPeriod | null> {
    try {
      // RLS will handle user filtering automatically, so we don't need .eq("user_id", userId)
      const { data, error } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("status", "ACTIVE")
        .order("start_date", { ascending: false })
        .limit(1);

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - this is expected if no active periods
        console.warn("No active pay periods found for user:", userId);
        return null;
      }

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch current pay period");
      }

      // Return the first result or null if no data
      return Array.isArray(data) ? data[0] || null : data || null;
    } catch (error) {
      console.error("getCurrentPayPeriod failed:", error);
      await logError(error as Error, {
        context: "PayPeriodService.getCurrentPayPeriod",
        userId,
      });
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  /**
   * Mark a pay period as completed
   */
  async completePayPeriod(
    payPeriodId: string,
    userId: string,
    actualNet?: number
  ): Promise<PayPeriod> {
    try {
      const updates: PayPeriodUpdate = {
        status: "COMPLETED",
        updated_at: new Date().toISOString(),
      };

      if (actualNet !== undefined) {
        updates.actual_net = actualNet;
      }

      return await this.updatePayPeriod(payPeriodId, userId, updates);
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.completePayPeriod",
        payPeriodId,
        userId,
        actualNet,
      });
      throw error;
    }
  }

  /**
   * Reactivate a completed pay period (mark as ACTIVE)
   */
  async reactivatePayPeriod(
    payPeriodId: string,
    userId: string
  ): Promise<PayPeriod> {
    try {
      // First, check if there's already an active period for this income source
      const payPeriod = await this.getPayPeriodWithDetails(payPeriodId, userId);
      if (!payPeriod) {
        throw new Error("Pay period not found");
      }

      // Check for existing active periods for the same income source
      const existingActive = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("income_source_id", payPeriod.income_source_id)
        .eq("status", "ACTIVE")
        .neq("id", payPeriodId);

      if (existingActive.data && existingActive.data.length > 0) {
        throw new Error(
          "Cannot reactivate: There is already an active pay period for this income source"
        );
      }

      const updates: PayPeriodUpdate = {
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      };

      return await this.updatePayPeriod(payPeriodId, userId, updates);
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.reactivatePayPeriod",
        payPeriodId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check if a pay period can be automatically completed
   * Returns true if all allocations are PAID
   */
  async canAutoComplete(payPeriodId: string): Promise<boolean> {
    try {
      const { data: allocations, error } = await this.supabase
        .from("allocations")
        .select("status")
        .eq("pay_period_id", payPeriodId);

      if (error) {
        throw handleDatabaseError(error, "Failed to check allocation status");
      }

      if (!allocations || allocations.length === 0) {
        return false; // No allocations, can't auto-complete
      }

      // Check if all allocations are PAID
      return allocations.every((allocation) => allocation.status === "PAID");
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.canAutoComplete",
        payPeriodId,
      });
      return false;
    }
  }

  /**
   * Auto-complete a pay period if all allocations are PAID
   */
  async tryAutoComplete(payPeriodId: string, userId: string): Promise<boolean> {
    try {
      const canComplete = await this.canAutoComplete(payPeriodId);
      if (canComplete) {
        await this.completePayPeriod(payPeriodId, userId);
        return true;
      }
      return false;
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.tryAutoComplete",
        payPeriodId,
        userId,
      });
      return false;
    }
  }

  /**
   * Validate if a pay period can be edited (must be ACTIVE)
   */
  async validatePayPeriodEditable(
    payPeriodId: string,
    userId: string
  ): Promise<{ canEdit: boolean; reason?: string }> {
    try {
      const { data: payPeriod, error } = await this.supabase
        .from("pay_periods")
        .select("status")
        .eq("id", payPeriodId)
        .eq("user_id", userId)
        .single();

      if (error) {
        return { canEdit: false, reason: "Pay period not found" };
      }

      if (payPeriod.status === "COMPLETED") {
        return {
          canEdit: false,
          reason: "Cannot edit completed pay periods",
        };
      }

      return { canEdit: true };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.validatePayPeriodEditable",
        payPeriodId,
        userId,
      });
      return { canEdit: false, reason: "Validation error" };
    }
  }

  /**
   * Get all active pay periods for a user
   */
  async getActivePayPeriods(userId: string): Promise<PayPeriod[]> {
    try {
      const { data, error } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .order("start_date", { ascending: false });

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch active pay periods");
      }

      return data || [];
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getActivePayPeriods",
        userId,
      });
      throw error;
    }
  }

  /**
   * Get completed pay periods for a user
   */
  async getCompletedPayPeriods(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<PayPeriod[]> {
    try {
      const { data, error } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "COMPLETED")
        .order("start_date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch completed pay periods"
        );
      }

      return data || [];
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getCompletedPayPeriods",
        userId,
        limit,
        offset,
      });
      throw error;
    }
  }

  /**
   * Get pay period statistics for a user
   */
  async getPayPeriodStats(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<PayPeriodStats> {
    try {
      let query = this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId);

      if (dateFrom) {
        query = query.gte("start_date", dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte("start_date", dateTo.toISOString());
      }

      const { data: periods, error } = await query;

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch pay period statistics"
        );
      }

      const totalPeriods = periods?.length || 0;
      const activePeriods =
        periods?.filter((p) => p.status === "ACTIVE").length || 0;
      const completedPeriods =
        periods?.filter((p) => p.status === "COMPLETED").length || 0;
      const totalExpected =
        periods?.reduce((sum, p) => sum + p.expected_net, 0) || 0;
      const totalActual =
        periods?.reduce((sum, p) => sum + (p.actual_net || 0), 0) || 0;

      // Calculate average period length
      const totalDays =
        periods?.reduce((sum, period) => {
          const start = new Date(period.start_date);
          const end = new Date(period.end_date);
          return (
            sum +
            Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ) +
            1
          );
        }, 0) || 0;

      const averagePeriodLengthDays =
        totalPeriods > 0 ? totalDays / totalPeriods : 0;
      const completionRate =
        totalPeriods > 0 ? (completedPeriods / totalPeriods) * 100 : 0;

      return {
        total_periods: totalPeriods,
        active_periods: activePeriods,
        completed_periods: completedPeriods,
        total_expected: totalExpected,
        total_actual: totalActual,
        average_period_length_days: averagePeriodLengthDays,
        completion_rate: completionRate,
      };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getPayPeriodStats",
        userId,
        dateFrom,
        dateTo,
      });
      throw error;
    }
  }

  /**
   * Get pay period history with enriched data for analysis
   */
  async getPayPeriodHistory(
    filters: PayPeriodHistoryFilters
  ): Promise<PayPeriodHistoryResponse> {
    try {
      let query = this.supabase
        .from("pay_periods")
        .select(
          `
          *,
          income_source:income_sources!pay_periods_income_source_id_fkey(
            name, cadence
          ),
          allocations:allocations(
            id, status, expected_amount, actual_amount
          )
        `
        )
        .eq("user_id", filters.user_id);

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.completed_only) {
        query = query.eq("status", "COMPLETED");
      }

      if (filters.income_source_id) {
        query = query.eq("income_source_id", filters.income_source_id);
      }

      // Date range filtering
      if (filters.date_range) {
        const now = new Date();
        let startDate: Date;

        switch (filters.date_range) {
          case "last_3_months":
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case "last_6_months":
            startDate = new Date(now.setMonth(now.getMonth() - 6));
            break;
          case "last_year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date("2000-01-01"); // All time
        }

        query = query.gte("start_date", startDate.toISOString());
      }

      if (filters.start_date_from) {
        query = query.gte("start_date", filters.start_date_from.toISOString());
      }

      if (filters.start_date_to) {
        query = query.lte("start_date", filters.start_date_to.toISOString());
      }

      // Sorting
      const sortBy = filters.sort_by || "date";
      const sortOrder = filters.sort_order || "desc";
      const ascending = sortOrder === "asc";

      if (sortBy === "date") {
        query = query.order("start_date", { ascending });
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: periods, error } = await query;

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch pay period history");
      }

      if (!periods) {
        return {
          data: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          summary: {
            total_expected: 0,
            total_actual: 0,
            total_variance: 0,
            average_completion_rate: 0,
          },
        };
      }

      // Transform data to PayPeriodHistoryItem format
      const historyItems: PayPeriodHistoryItem[] = periods.map((period) => {
        type AllocationFromQuery = {
          id: string;
          status: "PAID" | "UNPAID";
          expected_amount: number;
          actual_amount: number | null;
        };

        const allocations = (period.allocations as AllocationFromQuery[]) || [];
        const allocationCount = allocations.length;
        const paidAllocationCount = allocations.filter(
          (a) => a.status === "PAID"
        ).length;
        const completionPercentage =
          allocationCount > 0
            ? (paidAllocationCount / allocationCount) * 100
            : 0;

        const actualNet = period.actual_net || 0;
        const varianceAmount = actualNet - period.expected_net;
        const variancePercentage =
          period.expected_net > 0
            ? (varianceAmount / period.expected_net) * 100
            : 0;

        return {
          ...period,
          income_source_name: period.income_source?.name || "Unknown",
          income_source_cadence: period.income_source?.cadence || "monthly",
          allocation_count: allocationCount,
          paid_allocation_count: paidAllocationCount,
          completion_percentage: completionPercentage,
          variance_amount: varianceAmount,
          variance_percentage: variancePercentage,
        };
      });

      // Calculate summary statistics
      const totalExpected = historyItems.reduce(
        (sum, item) => sum + item.expected_net,
        0
      );
      const totalActual = historyItems.reduce(
        (sum, item) => sum + (item.actual_net || 0),
        0
      );
      const totalVariance = totalActual - totalExpected;
      const averageCompletionRate =
        historyItems.length > 0
          ? historyItems.reduce(
              (sum, item) => sum + item.completion_percentage,
              0
            ) / historyItems.length
          : 0;

      // Get total count for pagination (without limit)
      let countQuery = this.supabase
        .from("pay_periods")
        .select("id", { count: "exact", head: true })
        .eq("user_id", filters.user_id);

      if (filters.status) {
        countQuery = countQuery.eq("status", filters.status);
      }
      if (filters.completed_only) {
        countQuery = countQuery.eq("status", "COMPLETED");
      }

      const { count } = await countQuery;

      return {
        data: historyItems,
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        summary: {
          total_expected: totalExpected,
          total_actual: totalActual,
          total_variance: totalVariance,
          average_completion_rate: averageCompletionRate,
        },
      };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getPayPeriodHistory",
        filters,
      });
      throw error;
    }
  }

  /**
   * Get detailed reconciliation data for a specific pay period
   */
  async getReconciliationData(
    payPeriodId: string,
    userId: string
  ): Promise<ReconciliationData | null> {
    try {
      const { data: payPeriod, error: payPeriodError } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("id", payPeriodId)
        .eq("user_id", userId)
        .single();

      if (payPeriodError) {
        throw handleDatabaseError(
          payPeriodError,
          "Failed to fetch pay period for reconciliation"
        );
      }

      if (!payPeriod) {
        return null;
      }

      // Fetch allocations with budget item details
      const { data: allocations, error: allocationsError } = await this.supabase
        .from("allocations")
        .select(
          `
          *,
          budget_item:budget_items!allocations_budget_item_id_fkey(
            id, name, category
          )
        `
        )
        .eq("pay_period_id", payPeriodId);

      if (allocationsError) {
        throw handleDatabaseError(
          allocationsError,
          "Failed to fetch allocations for reconciliation"
        );
      }

      const allocationsList = allocations || [];

      // Calculate net variance
      const actualNet = payPeriod.actual_net || 0;
      const netVariance = actualNet - payPeriod.expected_net;
      const netVariancePercentage =
        payPeriod.expected_net > 0
          ? (netVariance / payPeriod.expected_net) * 100
          : 0;

      // Process allocations
      const reconciliationAllocations: ReconciliationAllocation[] =
        allocationsList.map((allocation) => {
          const actualAmount = allocation.actual_amount || 0;
          const variance = actualAmount - allocation.expected_amount;
          const variancePercentage =
            allocation.expected_amount > 0
              ? (variance / allocation.expected_amount) * 100
              : 0;

          return {
            id: allocation.id,
            budget_item_id: allocation.budget_item_id,
            budget_item_name: allocation.budget_item?.name || "Unknown",
            budget_item_category: allocation.budget_item?.category || "Other",
            expected_amount: allocation.expected_amount,
            actual_amount: allocation.actual_amount,
            variance,
            variance_percentage: variancePercentage,
            status: allocation.status,
          };
        });

      // Calculate allocation totals
      const totalExpectedAllocations = allocationsList.reduce(
        (sum, allocation) => sum + allocation.expected_amount,
        0
      );
      const totalActualAllocations = allocationsList.reduce(
        (sum, allocation) => sum + (allocation.actual_amount || 0),
        0
      );
      const allocationVariance =
        totalActualAllocations - totalExpectedAllocations;
      const allocationVariancePercentage =
        totalExpectedAllocations > 0
          ? (allocationVariance / totalExpectedAllocations) * 100
          : 0;

      // Calculate unallocated amount
      const unallocatedAmount = actualNet - totalActualAllocations;

      // Determine reconciliation status
      let reconciliationStatus:
        | "perfect"
        | "minor_variance"
        | "major_variance"
        | "incomplete";

      if (payPeriod.status !== "COMPLETED") {
        reconciliationStatus = "incomplete";
      } else {
        const absVariancePercentage = Math.abs(netVariancePercentage);
        if (absVariancePercentage <= VARIANCE_THRESHOLDS.PERFECT) {
          reconciliationStatus = "perfect";
        } else if (absVariancePercentage <= VARIANCE_THRESHOLDS.MINOR * 100) {
          reconciliationStatus = "minor_variance";
        } else {
          reconciliationStatus = "major_variance";
        }
      }

      return {
        pay_period_id: payPeriodId,
        start_date: new Date(payPeriod.start_date),
        end_date: new Date(payPeriod.end_date),
        expected_net: payPeriod.expected_net,
        actual_net: payPeriod.actual_net,
        net_variance: netVariance,
        net_variance_percentage: netVariancePercentage,
        allocations: reconciliationAllocations,
        total_expected_allocations: totalExpectedAllocations,
        total_actual_allocations: totalActualAllocations,
        allocation_variance: allocationVariance,
        allocation_variance_percentage: allocationVariancePercentage,
        unallocated_amount: unallocatedAmount,
        reconciliation_status: reconciliationStatus,
      };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getReconciliationData",
        payPeriodId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get reconciliation summary statistics for a user's pay periods
   */
  async getReconciliationSummary(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ReconciliationSummary> {
    try {
      // Build query for pay periods
      let periodsQuery = this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId);

      if (dateFrom) {
        periodsQuery = periodsQuery.gte("start_date", dateFrom.toISOString());
      }

      if (dateTo) {
        periodsQuery = periodsQuery.lte("start_date", dateTo.toISOString());
      }

      const { data: periods, error: periodsError } = await periodsQuery;

      if (periodsError) {
        throw handleDatabaseError(
          periodsError,
          "Failed to fetch pay periods for reconciliation summary"
        );
      }

      const allPeriods = periods || [];
      const completedPeriods = allPeriods.filter(
        (p) => p.status === "COMPLETED"
      );
      const totalPeriods = allPeriods.length;
      const completedPeriodsCount = completedPeriods.length;

      // If no completed periods, return empty summary
      if (completedPeriodsCount === 0) {
        return {
          total_periods: totalPeriods,
          completed_periods: 0,
          perfect_reconciliations: 0,
          minor_variance_count: 0,
          major_variance_count: 0,
          average_net_variance: 0,
          average_allocation_variance: 0,
          total_unallocated: 0,
        };
      }

      // Fetch allocations for completed periods
      const completedPeriodIds = completedPeriods.map((p) => p.id);
      const { data: allocations, error: allocationsError } = await this.supabase
        .from("allocations")
        .select("*")
        .in("pay_period_id", completedPeriodIds);

      if (allocationsError) {
        throw handleDatabaseError(
          allocationsError,
          "Failed to fetch allocations for reconciliation summary"
        );
      }

      const allAllocations = allocations || [];

      // Calculate reconciliation statistics
      let perfectReconciliations = 0;
      let minorVarianceCount = 0;
      let majorVarianceCount = 0;
      let totalNetVariance = 0;
      let totalAllocationVariance = 0;
      let totalUnallocated = 0;

      for (const period of completedPeriods) {
        const actualNet = period.actual_net || 0;
        const netVariance = actualNet - period.expected_net;
        const netVariancePercentage =
          period.expected_net > 0
            ? Math.abs(netVariance / period.expected_net) * 100
            : 0;

        // Categorize variance level
        if (netVariancePercentage <= VARIANCE_THRESHOLDS.PERFECT) {
          perfectReconciliations++;
        } else if (netVariancePercentage <= VARIANCE_THRESHOLDS.MINOR * 100) {
          minorVarianceCount++;
        } else {
          majorVarianceCount++;
        }

        totalNetVariance += Math.abs(netVariance);

        // Calculate allocation variance for this period
        const periodAllocations = allAllocations.filter(
          (a) => a.pay_period_id === period.id
        );
        const totalExpectedAllocations = periodAllocations.reduce(
          (sum, a) => sum + a.expected_amount,
          0
        );
        const totalActualAllocations = periodAllocations.reduce(
          (sum, a) => sum + (a.actual_amount || 0),
          0
        );

        const allocationVariance = Math.abs(
          totalActualAllocations - totalExpectedAllocations
        );
        totalAllocationVariance += allocationVariance;

        // Calculate unallocated amount
        const unallocated = actualNet - totalActualAllocations;
        totalUnallocated += Math.abs(unallocated);
      }

      // Calculate averages
      const averageNetVariance = totalNetVariance / completedPeriodsCount;
      const averageAllocationVariance =
        totalAllocationVariance / completedPeriodsCount;

      return {
        total_periods: totalPeriods,
        completed_periods: completedPeriodsCount,
        perfect_reconciliations: perfectReconciliations,
        minor_variance_count: minorVarianceCount,
        major_variance_count: majorVarianceCount,
        average_net_variance: averageNetVariance,
        average_allocation_variance: averageAllocationVariance,
        total_unallocated: totalUnallocated,
      };
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getReconciliationSummary",
        userId,
        dateFrom,
        dateTo,
      });
      throw error;
    }
  }

  /**
   * Get historical trend data aggregated by month
   */
  async getHistoricalTrends(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<HistoricalTrendData[]> {
    try {
      // Default to last 12 months if no date range provided
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 12);

      const startDate = dateFrom || defaultStartDate;
      const endDate = dateTo || defaultEndDate;

      // Fetch pay periods in date range
      const { data: periods, error: periodsError } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "COMPLETED")
        .gte("start_date", startDate.toISOString())
        .lte("start_date", endDate.toISOString())
        .order("start_date", { ascending: true });

      if (periodsError) {
        throw handleDatabaseError(
          periodsError,
          "Failed to fetch pay periods for trends"
        );
      }

      if (!periods || periods.length === 0) {
        return [];
      }

      // Fetch allocations for all periods
      const periodIds = periods.map((p) => p.id);
      const { data: allocations, error: allocationsError } = await this.supabase
        .from("allocations")
        .select(
          `
          *,
          budget_item:budget_items!allocations_budget_item_id_fkey(
            category
          )
        `
        )
        .in("pay_period_id", periodIds);

      if (allocationsError) {
        throw handleDatabaseError(
          allocationsError,
          "Failed to fetch allocations for trends"
        );
      }

      const allAllocations = allocations || [];

      // Group periods by month
      const monthlyData = new Map<
        string,
        {
          periods: typeof periods;
          month: Date;
          periodStart: Date;
          periodEnd: Date;
        }
      >();

      periods.forEach((period) => {
        const periodDate = new Date(period.start_date);
        const monthKey = `${periodDate.getFullYear()}-${periodDate
          .getMonth()
          .toString()
          .padStart(2, "0")}`;

        if (!monthlyData.has(monthKey)) {
          const monthStart = new Date(
            periodDate.getFullYear(),
            periodDate.getMonth(),
            1
          );
          const monthEnd = new Date(
            periodDate.getFullYear(),
            periodDate.getMonth() + 1,
            0
          );

          monthlyData.set(monthKey, {
            periods: [],
            month: monthStart,
            periodStart: monthStart,
            periodEnd: monthEnd,
          });
        }

        monthlyData.get(monthKey)!.periods.push(period);
      });

      // Calculate trends for each month
      const trends: HistoricalTrendData[] = [];

      for (const [monthKey, monthData] of monthlyData) {
        const monthPeriods = monthData.periods;
        const monthAllocations = allAllocations.filter((a) =>
          monthPeriods.some((p) => p.id === a.pay_period_id)
        );

        // Calculate totals
        const totalExpectedNet = monthPeriods.reduce(
          (sum, p) => sum + p.expected_net,
          0
        );
        const totalActualNet = monthPeriods.reduce(
          (sum, p) => sum + (p.actual_net || 0),
          0
        );
        const netVariance = totalActualNet - totalExpectedNet;
        const completionRate =
          monthPeriods.length > 0
            ? (monthPeriods.filter((p) => p.status === "COMPLETED").length /
                monthPeriods.length) *
              100
            : 0;

        const averageVariancePercentage =
          totalExpectedNet > 0 ? (netVariance / totalExpectedNet) * 100 : 0;

        // Calculate category trends
        const categoryMap = new Map<
          string,
          {
            expected: number;
            actual: number;
          }
        >();

        monthAllocations.forEach((allocation) => {
          const category = allocation.budget_item?.category || "Other";

          if (!categoryMap.has(category)) {
            categoryMap.set(category, { expected: 0, actual: 0 });
          }

          const categoryData = categoryMap.get(category)!;
          categoryData.expected += allocation.expected_amount;
          categoryData.actual += allocation.actual_amount || 0;
        });

        const categories = Array.from(categoryMap.entries()).map(
          ([category, data]) => ({
            category,
            expected_amount: data.expected,
            actual_amount: data.actual,
            variance: data.actual - data.expected,
            variance_percentage:
              data.expected > 0
                ? ((data.actual - data.expected) / data.expected) * 100
                : 0,
          })
        );

        trends.push({
          period: monthKey,
          period_start: monthData.periodStart,
          period_end: monthData.periodEnd,
          pay_periods_count: monthPeriods.length,
          total_expected_net: totalExpectedNet,
          total_actual_net: totalActualNet,
          net_variance: netVariance,
          completion_rate: completionRate,
          average_variance_percentage: averageVariancePercentage,
          categories,
        });
      }

      return trends.sort(
        (a, b) => a.period_start.getTime() - b.period_start.getTime()
      );
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getHistoricalTrends",
        userId,
        dateFrom,
        dateTo,
      });
      throw error;
    }
  }
}
