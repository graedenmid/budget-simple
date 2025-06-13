import { getBudgetItemsForUser } from "@/lib/database/client-queries";
import { PayPeriodService } from "@/lib/services/pay-period-service";
import { AllocationService } from "@/lib/services/allocation-service";
import type {
  AllocationCalculationRequest,
  AllocationCalculationResponse,
} from "@/lib/types/allocations";
import type { BudgetItem, IncomeSource } from "@/types/database";

const payPeriodService = new PayPeriodService();
const allocationService = new AllocationService();

/**
 * Generate allocations for a pay period from user's budget items
 */
export async function generateAllocationsForPayPeriod(
  payPeriodId: string,
  userId: string,
  proRateFactor?: number
): Promise<{
  success: boolean;
  allocations?: unknown[];
  calculation?: AllocationCalculationResponse;
  error?: string;
}> {
  try {
    // Get pay period with income source details
    const payPeriod = await payPeriodService.getPayPeriodWithDetails(
      payPeriodId,
      userId
    );

    if (!payPeriod) {
      return {
        success: false,
        error: "Pay period not found",
      };
    }

    if (!payPeriod.income_source) {
      return {
        success: false,
        error: "Income source not found for pay period",
      };
    }

    // Get active budget items for the user
    const budgetItems = await getBudgetItemsForUser(userId, true);

    if (budgetItems.length === 0) {
      return {
        success: false,
        error: "No active budget items found",
      };
    }

    // Prepare calculation request
    const request: AllocationCalculationRequest = {
      pay_period_id: payPeriodId,
      budget_items: budgetItems,
      income_source: payPeriod.income_source as IncomeSource,
      pro_rate_factor: proRateFactor,
    };

    // Generate allocations
    const allocations = await allocationService.generateAllocationsForPayPeriod(
      request
    );

    // Get calculation details for response
    const calculationResponse = await allocationService.calculateAllocations(
      request
    );

    return {
      success: true,
      allocations,
      calculation: calculationResponse,
    };
  } catch (error) {
    console.error("Failed to generate allocations for pay period:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Calculate allocation preview without saving to database
 */
export async function previewAllocations(
  payPeriodId: string,
  userId: string,
  budgetItems?: BudgetItem[],
  proRateFactor?: number
): Promise<{
  success: boolean;
  calculation?: AllocationCalculationResponse;
  error?: string;
}> {
  try {
    // Get pay period with income source details
    const payPeriod = await payPeriodService.getPayPeriodWithDetails(
      payPeriodId,
      userId
    );

    if (!payPeriod) {
      return {
        success: false,
        error: "Pay period not found",
      };
    }

    if (!payPeriod.income_source) {
      return {
        success: false,
        error: "Income source not found for pay period",
      };
    }

    // Use provided budget items or fetch user's active items
    const items = budgetItems || (await getBudgetItemsForUser(userId, true));

    if (items.length === 0) {
      return {
        success: false,
        error: "No budget items provided",
      };
    }

    // Prepare calculation request
    const request: AllocationCalculationRequest = {
      pay_period_id: payPeriodId,
      budget_items: items,
      income_source: payPeriod.income_source as IncomeSource,
      pro_rate_factor: proRateFactor,
    };

    // Calculate allocations
    const calculation = await allocationService.calculateAllocations(request);

    return {
      success: true,
      calculation,
    };
  } catch (error) {
    console.error("Failed to preview allocations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Check if pay period needs allocation generation
 */
export async function checkAllocationStatus(payPeriodId: string): Promise<{
  has_allocations: boolean;
  allocation_count: number;
  last_generated?: string;
  needs_regeneration: boolean;
}> {
  try {
    const allocations = await allocationService.getAllocationsForPayPeriod(
      payPeriodId
    );

    const hasAllocations = allocations.length > 0;
    const lastGenerated = hasAllocations
      ? allocations[0]?.created_at
      : undefined;

    // Simple heuristic: needs regeneration if no allocations exist
    // In the future, this could check if budget items have been modified since last generation
    const needsRegeneration = !hasAllocations;

    return {
      has_allocations: hasAllocations,
      allocation_count: allocations.length,
      last_generated: lastGenerated,
      needs_regeneration: needsRegeneration,
    };
  } catch (error) {
    console.error("Failed to check allocation status:", error);
    return {
      has_allocations: false,
      allocation_count: 0,
      needs_regeneration: true,
    };
  }
}

/**
 * Calculate remaining budget for a pay period
 */
export async function calculateRemainingBudget(payPeriodId: string): Promise<{
  expected_net: number;
  total_allocated: number;
  total_paid: number;
  remaining_to_allocate: number;
  remaining_to_spend: number;
}> {
  try {
    const [payPeriod, summary] = await Promise.all([
      payPeriodService.getPayPeriodWithDetails(payPeriodId, ""), // User validation handled by RLS
      allocationService.getAllocationSummary(payPeriodId),
    ]);

    const expectedNet = payPeriod?.expected_net || 0;
    const totalAllocated = summary.total_expected;
    const totalPaid = summary.total_actual;

    return {
      expected_net: expectedNet,
      total_allocated: totalAllocated,
      total_paid: totalPaid,
      remaining_to_allocate: expectedNet - totalAllocated,
      remaining_to_spend: totalAllocated - totalPaid,
    };
  } catch (error) {
    console.error("Failed to calculate remaining budget:", error);
    return {
      expected_net: 0,
      total_allocated: 0,
      total_paid: 0,
      remaining_to_allocate: 0,
      remaining_to_spend: 0,
    };
  }
}

/**
 * Get allocation breakdown by category
 */
export async function getAllocationBreakdown(payPeriodId: string): Promise<{
  categories: Record<
    string,
    {
      expected: number;
      actual: number;
      count: number;
      percentage_of_total: number;
    }
  >;
  total_expected: number;
  total_actual: number;
}> {
  try {
    const summary = await allocationService.getAllocationSummary(payPeriodId);

    // Calculate percentages for each category
    const categoriesWithPercentages = Object.entries(summary.categories).reduce(
      (acc, [category, data]) => {
        acc[category] = {
          ...data,
          percentage_of_total:
            summary.total_expected > 0
              ? (data.expected / summary.total_expected) * 100
              : 0,
        };
        return acc;
      },
      {} as Record<
        string,
        {
          expected: number;
          actual: number;
          count: number;
          percentage_of_total: number;
        }
      >
    );

    return {
      categories: categoriesWithPercentages,
      total_expected: summary.total_expected,
      total_actual: summary.total_actual,
    };
  } catch (error) {
    console.error("Failed to get allocation breakdown:", error);
    return {
      categories: {},
      total_expected: 0,
      total_actual: 0,
    };
  }
}

/**
 * Validate budget configuration before allocation generation
 */
export async function validateBudgetForAllocation(
  budgetItems: BudgetItem[]
): Promise<{
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for active budget items
  const activeItems = budgetItems.filter((item) => item.is_active);
  if (activeItems.length === 0) {
    errors.push("No active budget items found");
    return { is_valid: false, errors, warnings };
  }

  // Check for REMAINING_PERCENT items without dependencies
  const remainingPercentItems = activeItems.filter(
    (item) => item.calc_type === "REMAINING_PERCENT"
  );

  remainingPercentItems.forEach((item) => {
    if (!item.depends_on || item.depends_on.length === 0) {
      errors.push(
        `Budget item "${item.name}" uses REMAINING_PERCENT but has no dependencies`
      );
    }
  });

  // Check for missing dependencies
  const itemIds = new Set(activeItems.map((item) => item.id));
  activeItems.forEach((item) => {
    if (item.depends_on) {
      item.depends_on.forEach((depId) => {
        if (!itemIds.has(depId)) {
          errors.push(
            `Budget item "${item.name}" depends on non-existent or inactive item`
          );
        }
      });
    }
  });

  // Check for potential circular dependencies (simplified check)
  remainingPercentItems.forEach((item) => {
    if (item.depends_on?.includes(item.id)) {
      errors.push(`Budget item "${item.name}" has a circular dependency`);
    }
  });

  // Check for percentage values
  activeItems.forEach((item) => {
    if (
      ["GROSS_PERCENT", "NET_PERCENT", "REMAINING_PERCENT"].includes(
        item.calc_type
      )
    ) {
      if (item.value <= 0 || item.value > 100) {
        warnings.push(
          `Budget item "${item.name}" has unusual percentage value: ${item.value}%`
        );
      }
    }
  });

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format allocation amount for display
 */
export function formatAllocationAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate allocation completion percentage
 */
export function calculateCompletionPercentage(
  expected: number,
  actual: number
): number {
  if (expected === 0) return 0;
  return Math.min((actual / expected) * 100, 100);
}

/**
 * Get allocation status color for UI
 */
export function getAllocationStatusColor(
  status: "PAID" | "UNPAID",
  expected: number,
  actual: number
): "green" | "yellow" | "red" | "gray" {
  if (status === "UNPAID") return "gray";
  if (actual >= expected) return "green";
  if (actual >= expected * 0.8) return "yellow";
  return "red";
}
