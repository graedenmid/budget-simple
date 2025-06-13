import { createClient } from "@/lib/supabase/client";

// Simple database error handler
function handleDatabaseError(error: unknown, message: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${message}: ${errorMessage}`);
}
import type {
  Allocation,
  AllocationInsert,
  AllocationUpdate,
  AllocationWithDetails,
  AllocationSummary,
  AllocationBatchCreate,
  AllocationBatchUpdate,
  AllocationValidationResult,
  AllocationCalculationRequest,
  AllocationCalculationResponse,
} from "@/lib/types/allocations";

export class AllocationService {
  private supabase = createClient();

  /**
   * Get allocations for a specific pay period
   */
  async getAllocationsForPayPeriod(
    payPeriodId: string,
    includeDetails = false
  ): Promise<AllocationWithDetails[]> {
    try {
      const query = this.supabase
        .from("allocations")
        .select("*")
        .eq("pay_period_id", payPeriodId)
        .order("created_at", { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch allocations for pay period"
        );
      }

      if (!includeDetails) {
        return (data as AllocationWithDetails[]) || [];
      }

      // Fetch related data separately if details are needed
      const allocationsWithDetails = await Promise.all(
        (data || []).map(async (allocation) => {
          const [budgetItem, payPeriod] = await Promise.all([
            this.supabase
              .from("budget_items")
              .select("id, name, category, calc_type, value, priority")
              .eq("id", allocation.budget_item_id)
              .single(),
            this.supabase
              .from("pay_periods")
              .select("id, start_date, end_date, expected_net")
              .eq("id", allocation.pay_period_id)
              .single(),
          ]);

          return {
            ...allocation,
            budget_item: budgetItem.data,
            pay_period: payPeriod.data,
          } as AllocationWithDetails;
        })
      );

      return allocationsWithDetails;
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to fetch allocations for pay period"
      );
    }
  }

  /**
   * Get a single allocation by ID
   */
  async getAllocationById(
    allocationId: string,
    includeDetails = false
  ): Promise<AllocationWithDetails | null> {
    try {
      const { data, error } = await this.supabase
        .from("allocations")
        .select("*")
        .eq("id", allocationId)
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to fetch allocation");
      }

      if (!data || !includeDetails) {
        return data as AllocationWithDetails | null;
      }

      // Fetch related data separately if details are needed
      const [budgetItem, payPeriod] = await Promise.all([
        this.supabase
          .from("budget_items")
          .select("id, name, category, calc_type, value, priority")
          .eq("id", data.budget_item_id)
          .single(),
        this.supabase
          .from("pay_periods")
          .select("id, start_date, end_date, expected_net")
          .eq("id", data.pay_period_id)
          .single(),
      ]);

      return {
        ...data,
        budget_item: budgetItem.data,
        pay_period: payPeriod.data,
      } as AllocationWithDetails;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to fetch allocation");
    }
  }

  /**
   * Create a single allocation
   */
  async createAllocation(allocation: AllocationInsert): Promise<Allocation> {
    try {
      const { data, error } = await this.supabase
        .from("allocations")
        .insert(allocation)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to create allocation");
      }

      return data;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to create allocation");
    }
  }

  /**
   * Create multiple allocations in batch
   */
  async createAllocationsBatch(
    batchData: AllocationBatchCreate
  ): Promise<Allocation[]> {
    try {
      const allocationsToInsert: AllocationInsert[] = batchData.allocations.map(
        (allocation) => ({
          pay_period_id: batchData.pay_period_id,
          budget_item_id: allocation.budget_item_id,
          expected_amount: allocation.expected_amount,
          status: allocation.status || "UNPAID",
        })
      );

      const { data, error } = await this.supabase
        .from("allocations")
        .insert(allocationsToInsert)
        .select();

      if (error) {
        throw handleDatabaseError(error, "Failed to create allocations batch");
      }

      return data || [];
    } catch (error) {
      throw handleDatabaseError(error, "Failed to create allocations batch");
    }
  }

  /**
   * Update a single allocation
   */
  async updateAllocation(
    allocationId: string,
    updates: AllocationUpdate
  ): Promise<Allocation> {
    try {
      const { data, error } = await this.supabase
        .from("allocations")
        .update(updates)
        .eq("id", allocationId)
        .select()
        .single();

      if (error) {
        throw handleDatabaseError(error, "Failed to update allocation");
      }

      return data;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to update allocation");
    }
  }

  /**
   * Update multiple allocations in batch
   */
  async updateAllocationsBatch(
    batchData: AllocationBatchUpdate
  ): Promise<Allocation[]> {
    try {
      const updates = await Promise.all(
        batchData.updates.map(async (update) => {
          const { id, ...updateData } = update;
          return this.updateAllocation(id, updateData);
        })
      );

      return updates;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to update allocations batch");
    }
  }

  /**
   * Delete an allocation
   */
  async deleteAllocation(allocationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("allocations")
        .delete()
        .eq("id", allocationId);

      if (error) {
        throw handleDatabaseError(error, "Failed to delete allocation");
      }
    } catch (error) {
      throw handleDatabaseError(error, "Failed to delete allocation");
    }
  }

  /**
   * Delete all allocations for a pay period
   */
  async deleteAllocationsForPayPeriod(payPeriodId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("allocations")
        .delete()
        .eq("pay_period_id", payPeriodId);

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to delete allocations for pay period"
        );
      }
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to delete allocations for pay period"
      );
    }
  }

  /**
   * Calculate allocation summary for a pay period
   */
  async getAllocationSummary(payPeriodId: string): Promise<AllocationSummary> {
    try {
      const allocations = await this.getAllocationsForPayPeriod(
        payPeriodId,
        true
      );

      const summary: AllocationSummary = {
        pay_period_id: payPeriodId,
        total_expected: 0,
        total_actual: 0,
        total_remaining: 0,
        paid_count: 0,
        unpaid_count: 0,
        categories: {},
      };

      allocations.forEach((allocation) => {
        // Totals
        summary.total_expected += allocation.expected_amount;
        summary.total_actual += allocation.actual_amount || 0;

        // Status counts
        if (allocation.status === "PAID") {
          summary.paid_count++;
        } else {
          summary.unpaid_count++;
        }

        // Category breakdown
        const category = allocation.budget_item?.category || "Other";
        if (!summary.categories[category]) {
          summary.categories[category] = {
            expected: 0,
            actual: 0,
            count: 0,
          };
        }

        summary.categories[category].expected += allocation.expected_amount;
        summary.categories[category].actual += allocation.actual_amount || 0;
        summary.categories[category].count++;
      });

      summary.total_remaining = summary.total_expected - summary.total_actual;

      return summary;
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to calculate allocation summary"
      );
    }
  }

  /**
   * Validate allocations for a pay period
   */
  async validateAllocations(
    payPeriodId: string
  ): Promise<AllocationValidationResult> {
    try {
      const allocations = await this.getAllocationsForPayPeriod(
        payPeriodId,
        true
      );

      const result: AllocationValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };

      allocations.forEach((allocation) => {
        // Check for negative amounts
        if (allocation.expected_amount < 0) {
          result.errors.push({
            type: "negative_amount",
            message: `Expected amount cannot be negative`,
            budget_item_id: allocation.budget_item_id,
            suggested_fix: "Verify budget item calculation",
          });
          result.is_valid = false;
        }

        // Check for amount mismatches
        if (allocation.actual_amount !== null && allocation.actual_amount < 0) {
          result.errors.push({
            type: "negative_amount",
            message: `Actual amount cannot be negative`,
            budget_item_id: allocation.budget_item_id,
            suggested_fix: "Enter a valid positive amount",
          });
          result.is_valid = false;
        }

        // Check for missing budget item
        if (!allocation.budget_item) {
          result.errors.push({
            type: "missing_data",
            message: `Budget item not found`,
            budget_item_id: allocation.budget_item_id,
            suggested_fix: "Verify budget item exists and is active",
          });
          result.is_valid = false;
        }

        // Check for rounding differences
        if (
          allocation.actual_amount !== null &&
          Math.abs(allocation.expected_amount - allocation.actual_amount) > 0.01
        ) {
          result.warnings.push({
            type: "rounding_adjustment",
            message: `Actual amount differs from expected amount`,
            budget_item_id: allocation.budget_item_id,
          });
        }
      });

      return result;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to validate allocations");
    }
  }

  /**
   * Calculate allocations using the budget calculation engine
   */
  async calculateAllocations(
    request: AllocationCalculationRequest
  ): Promise<AllocationCalculationResponse> {
    try {
      // Call the allocation calculation Edge Function
      const { data, error } = await this.supabase.functions.invoke(
        "allocation-engine",
        {
          body: {
            pay_period_id: request.pay_period_id,
            budget_items: request.budget_items,
            income_source: request.income_source,
            pro_rate_factor: request.pro_rate_factor,
          },
        }
      );

      if (error) {
        throw handleDatabaseError(error, "Failed to calculate allocations");
      }

      return data as AllocationCalculationResponse;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to calculate allocations");
    }
  }

  /**
   * Generate and save allocations for a pay period
   */
  async generateAllocationsForPayPeriod(
    request: AllocationCalculationRequest
  ): Promise<Allocation[]> {
    try {
      // First calculate the allocations
      const calculationResponse = await this.calculateAllocations(request);

      if (!calculationResponse.success) {
        throw new Error(
          `Allocation calculation failed: ${calculationResponse.summary.calculation_errors.join(
            ", "
          )}`
        );
      }

      // Delete existing allocations for this pay period
      await this.deleteAllocationsForPayPeriod(request.pay_period_id);

      // Create new allocations from calculation results
      const batchData: AllocationBatchCreate = {
        pay_period_id: request.pay_period_id,
        allocations: calculationResponse.allocations.map((calc) => ({
          budget_item_id: calc.budget_item_id,
          expected_amount: calc.expected_amount,
          status: "UNPAID" as const,
        })),
      };

      return await this.createAllocationsBatch(batchData);
    } catch (error) {
      throw handleDatabaseError(
        error,
        "Failed to generate allocations for pay period"
      );
    }
  }

  /**
   * Mark allocation as paid with optional actual amount
   */
  async markAllocationAsPaid(
    allocationId: string,
    actualAmount?: number
  ): Promise<Allocation> {
    try {
      const updates: AllocationUpdate = {
        status: "PAID",
        updated_at: new Date().toISOString(),
      };

      if (actualAmount !== undefined) {
        updates.actual_amount = actualAmount;
      }

      return await this.updateAllocation(allocationId, updates);
    } catch (error) {
      throw handleDatabaseError(error, "Failed to mark allocation as paid");
    }
  }

  /**
   * Mark allocation as unpaid
   */
  async markAllocationAsUnpaid(allocationId: string): Promise<Allocation> {
    try {
      return await this.updateAllocation(allocationId, {
        status: "UNPAID",
        actual_amount: null,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      throw handleDatabaseError(error, "Failed to mark allocation as unpaid");
    }
  }

  /**
   * Get allocations for multiple pay periods (for history/reporting)
   */
  async getAllocationsForUser(
    userId: string,
    limit = 100,
    offset = 0
  ): Promise<AllocationWithDetails[]> {
    try {
      // First get the pay periods for the user to filter allocations
      const { data: payPeriods, error: payPeriodError } = await this.supabase
        .from("pay_periods")
        .select("id")
        .eq("user_id", userId);

      if (payPeriodError) {
        throw handleDatabaseError(
          payPeriodError,
          "Failed to fetch user pay periods"
        );
      }

      if (!payPeriods || payPeriods.length === 0) {
        return [];
      }

      const payPeriodIds = payPeriods.map((pp) => pp.id);

      const { data, error } = await this.supabase
        .from("allocations")
        .select("*")
        .in("pay_period_id", payPeriodIds)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw handleDatabaseError(
          error,
          "Failed to fetch allocations for user"
        );
      }

      // Fetch related data for each allocation
      const allocationsWithDetails = await Promise.all(
        (data || []).map(async (allocation) => {
          const [budgetItem, payPeriod] = await Promise.all([
            this.supabase
              .from("budget_items")
              .select("id, name, category, calc_type, value, priority")
              .eq("id", allocation.budget_item_id)
              .single(),
            this.supabase
              .from("pay_periods")
              .select("id, start_date, end_date, expected_net")
              .eq("id", allocation.pay_period_id)
              .single(),
          ]);

          return {
            ...allocation,
            budget_item: budgetItem.data,
            pay_period: payPeriod.data,
          } as AllocationWithDetails;
        })
      );

      return allocationsWithDetails;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to fetch allocations for user");
    }
  }
}
