import { createClient } from "@/lib/supabase/client";
import { PayPeriodService } from "./pay-period-service";

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
  AllocationCalculationResult,
} from "@/lib/types/allocations";

export class AllocationService {
  private supabase = createClient();
  private payPeriodService = new PayPeriodService();

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
        console.warn(
          "Edge Function calculation failed, falling back to local calculation:",
          error
        );
        return this.simpleCalculateAllocations(request);
      }

      return data as AllocationCalculationResponse;
    } catch (error) {
      // Fallback to local calculation for any invocation error
      console.error(
        "Allocation Edge Function invocation error, using local calculation:",
        error
      );
      return this.simpleCalculateAllocations(request);
    }
  }

  /**
   * Very simple local allocation calculator used as a fallback when the Edge Function is unavailable.
   * Supports FIXED, GROSS_PERCENT, NET_PERCENT. REMAINING_PERCENT simply uses the remaining budget after
   * other items are allocated. Dependency ordering and advanced pro-rating are NOT handled here – this
   * exists only to keep the app functional during local development when Edge Functions are unreachable.
   */
  private simpleCalculateAllocations(
    request: AllocationCalculationRequest
  ): AllocationCalculationResponse {
    const { budget_items, income_source, pay_period_id } = request;

    // Sort items so fixed/percentage come first; remaining_percent last
    const fixedAndPercent = budget_items.filter(
      (bi) => bi.calc_type !== "REMAINING_PERCENT"
    );
    const remainingPercentItems = budget_items.filter(
      (bi) => bi.calc_type === "REMAINING_PERCENT"
    );

    let totalAllocated = 0;
    const allocations: AllocationCalculationResult[] = [];

    const addAllocation = (
      itemId: string,
      amount: number,
      details: Partial<AllocationCalculationResult["calculation_details"]>
    ) => {
      allocations.push({
        budget_item_id: itemId,
        expected_amount: Number(amount.toFixed(2)),
        calculation_details: {
          base_amount: income_source.net_amount,
          calculation_type: details.calculation_type!,
          ...details,
        },
      });
      totalAllocated += amount;
    };

    // Handle FIXED, GROSS_PERCENT, NET_PERCENT first
    for (const item of fixedAndPercent) {
      switch (item.calc_type) {
        case "FIXED":
          addAllocation(item.id, item.value, { calculation_type: "FIXED" });
          break;
        case "GROSS_PERCENT":
        case "NET_PERCENT": {
          const base = income_source.net_amount; // gross not stored; use net for dev simplicity
          const amount = (base * item.value) / 100;
          addAllocation(item.id, amount, {
            calculation_type: item.calc_type,
            percentage: item.value,
          });
          break;
        }
        default:
          // Skip unsupported types here
          break;
      }
    }

    // Remaining_percent items share the leftover equally by percentage value weight
    if (remainingPercentItems.length > 0) {
      const remainingBudget = Math.max(
        income_source.net_amount - totalAllocated,
        0
      );
      const totalPercent = remainingPercentItems.reduce(
        (sum, bi) => sum + bi.value,
        0
      );
      for (const item of remainingPercentItems) {
        const amount = (remainingBudget * item.value) / totalPercent;
        addAllocation(item.id, amount, {
          calculation_type: "REMAINING_PERCENT",
          percentage: item.value,
        });
      }
    }

    const totalRemaining = income_source.net_amount - totalAllocated;

    return {
      success: true,
      pay_period_id,
      allocations,
      summary: {
        total_allocated: Number(totalAllocated.toFixed(2)),
        total_remaining: Number(totalRemaining.toFixed(2)),
        items_processed: budget_items.length,
        calculation_errors: [],
      },
      calculation_order: allocations.map((a) => a.budget_item_id),
      timestamp: new Date().toISOString(),
    };
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
   * Automatically tries to complete the pay period if all allocations are paid
   */
  async markAllocationAsPaid(
    allocationId: string,
    actualAmount?: number,
    userId?: string
  ): Promise<Allocation> {
    try {
      // Get the allocation to find the pay period
      const allocation = await this.getAllocationById(allocationId, false);
      if (!allocation) {
        throw new Error("Allocation not found");
      }

      const updates: AllocationUpdate = {
        status: "PAID",
        updated_at: new Date().toISOString(),
      };

      if (actualAmount !== undefined) {
        updates.actual_amount = actualAmount;
      }

      const updatedAllocation = await this.updateAllocation(
        allocationId,
        updates
      );

      // Try to auto-complete the pay period if all allocations are paid
      if (userId) {
        try {
          await this.payPeriodService.tryAutoComplete(
            allocation.pay_period_id,
            userId
          );
        } catch (error) {
          // Don't fail the allocation update if auto-completion fails
          console.warn("Failed to auto-complete pay period:", error);
        }
      }

      return updatedAllocation;
    } catch (error) {
      throw handleDatabaseError(error, "Failed to mark allocation as paid");
    }
  }

  /**
   * Mark allocation as unpaid
   * This may reactivate a completed pay period if needed
   */
  async markAllocationAsUnpaid(
    allocationId: string,
    userId?: string
  ): Promise<Allocation> {
    try {
      // Get the allocation to find the pay period
      const allocation = await this.getAllocationById(allocationId, false);
      if (!allocation) {
        throw new Error("Allocation not found");
      }

      // Check if the pay period is completed
      if (userId) {
        try {
          const { data: payPeriod } = await this.supabase
            .from("pay_periods")
            .select("status")
            .eq("id", allocation.pay_period_id)
            .single();

          if (payPeriod?.status === "COMPLETED") {
            // Reactivate the pay period since we're marking an allocation as unpaid
            await this.payPeriodService.reactivatePayPeriod(
              allocation.pay_period_id,
              userId
            );
          }
        } catch (error) {
          // Don't fail the allocation update if reactivation fails
          console.warn("Failed to reactivate pay period:", error);
        }
      }

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
