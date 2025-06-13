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
} from "@/lib/types/pay-periods";
import {
  calculateFirstPayPeriod,
  calculateNextPayPeriod,
  validatePayPeriod,
} from "@/lib/utils/pay-period-calculations";

import { logger } from "@/lib/error-handling";

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
      const { data, error } = await this.supabase
        .from("pay_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw handleDatabaseError(error, "Failed to fetch current pay period");
      }

      return data || null;
    } catch (error) {
      await logError(error as Error, {
        context: "PayPeriodService.getCurrentPayPeriod",
        userId,
      });
      throw error;
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
}
