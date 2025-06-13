import type { BudgetItem, IncomeSource } from "@/types/database";

export interface CalculationResult {
  budgetItemId: string;
  expectedAmount: number;
  calculationDetails: {
    baseAmount: number;
    calculationType: string;
    percentage?: number;
    dependsOnTotal?: number;
  };
}

export interface BudgetSummary {
  totalAllocated: number;
  grossIncome: number;
  netIncome: number;
  remaining: number;
  percentAllocated: number;
  healthScore: number;
  status: "excellent" | "good" | "warning" | "danger";
}

/**
 * Calculate allocation for a single budget item
 */
export function calculateBudgetItemAllocation(
  budgetItem: BudgetItem,
  incomeSource: IncomeSource,
  remainingIncome?: number
): number {
  switch (budgetItem.calc_type) {
    case "FIXED":
      return Number(budgetItem.value);

    case "GROSS_PERCENT":
      return (
        (Number(budgetItem.value) / 100) * Number(incomeSource.gross_amount)
      );

    case "NET_PERCENT":
      return (Number(budgetItem.value) / 100) * Number(incomeSource.net_amount);

    case "REMAINING_PERCENT":
      if (remainingIncome === undefined) {
        throw new Error(
          "Remaining income is required for REMAINING_PERCENT calculation"
        );
      }
      return (Number(budgetItem.value) / 100) * remainingIncome;

    default:
      return 0;
  }
}

/**
 * Calculate allocations for all budget items with dependency resolution
 */
export function calculateBudgetAllocations(
  budgetItems: BudgetItem[],
  incomeSource: IncomeSource
): CalculationResult[] {
  // Sort by priority and resolve dependencies
  const sortedItems = resolveBudgetItemDependencies(budgetItems);
  const results: CalculationResult[] = [];

  for (const item of sortedItems) {
    const result = calculateSingleAllocation(item, incomeSource, results);
    results.push(result);
  }

  return results;
}

/**
 * Calculate allocation for a single item with dependency context
 */
function calculateSingleAllocation(
  budgetItem: BudgetItem,
  incomeSource: IncomeSource,
  existingAllocations: CalculationResult[]
): CalculationResult {
  let expectedAmount = 0;
  const calculationDetails: CalculationResult["calculationDetails"] = {
    baseAmount: 0,
    calculationType: budgetItem.calc_type,
  };

  switch (budgetItem.calc_type) {
    case "FIXED":
      expectedAmount = budgetItem.value;
      calculationDetails.baseAmount = budgetItem.value;
      break;

    case "GROSS_PERCENT":
      expectedAmount = (incomeSource.gross_amount * budgetItem.value) / 100;
      calculationDetails.baseAmount = incomeSource.gross_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "NET_PERCENT":
      expectedAmount = (incomeSource.net_amount * budgetItem.value) / 100;
      calculationDetails.baseAmount = incomeSource.net_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "REMAINING_PERCENT":
      const dependentTotal =
        budgetItem.depends_on?.reduce((total, depId) => {
          const depAllocation = existingAllocations.find(
            (a) => a.budgetItemId === depId
          );
          return total + (depAllocation?.expectedAmount || 0);
        }, 0) || 0;

      const remainingAmount = incomeSource.net_amount - dependentTotal;
      expectedAmount = (remainingAmount * budgetItem.value) / 100;
      calculationDetails.baseAmount = remainingAmount;
      calculationDetails.percentage = budgetItem.value;
      calculationDetails.dependsOnTotal = dependentTotal;
      break;

    default:
      console.warn(`Unknown calculation type: ${budgetItem.calc_type}`);
      expectedAmount = 0;
  }

  return {
    budgetItemId: budgetItem.id,
    expectedAmount: Math.round(expectedAmount * 100) / 100,
    calculationDetails,
  };
}

/**
 * Resolve budget item dependencies to ensure proper calculation order
 */
export function resolveBudgetItemDependencies(
  budgetItems: BudgetItem[]
): BudgetItem[] {
  const resolved: BudgetItem[] = [];
  const pending = [...budgetItems.filter((item) => item.is_active)];
  const resolvedIds = new Set<string>();

  // Sort by priority first
  pending.sort((a, b) => a.priority - b.priority);

  while (pending.length > 0) {
    const previousLength = pending.length;

    for (let i = pending.length - 1; i >= 0; i--) {
      const item = pending[i];

      // Check if all dependencies are resolved
      const allDependenciesResolved =
        !item.depends_on ||
        item.depends_on.length === 0 ||
        item.depends_on.every((depId) => resolvedIds.has(depId));

      if (allDependenciesResolved) {
        resolved.push(item);
        resolvedIds.add(item.id);
        pending.splice(i, 1);
      }
    }

    // Prevent infinite loop in case of circular dependencies
    if (pending.length === previousLength) {
      console.warn(
        "Circular dependency detected in budget items:",
        pending.map((item) => item.id)
      );
      // Add remaining items anyway
      resolved.push(...pending);
      break;
    }
  }

  return resolved;
}

/**
 * Calculate budget summary and health metrics
 */
export function calculateBudgetSummary(
  allocations: CalculationResult[],
  incomeSource: IncomeSource
): BudgetSummary {
  const totalAllocated = allocations.reduce(
    (sum, alloc) => sum + alloc.expectedAmount,
    0
  );
  const remaining = incomeSource.net_amount - totalAllocated;
  const percentAllocated =
    incomeSource.net_amount > 0
      ? (totalAllocated / incomeSource.net_amount) * 100
      : 0;

  let healthScore = 100;
  let status: "excellent" | "good" | "warning" | "danger" = "excellent";

  if (percentAllocated > 100) {
    // Over-allocated
    healthScore = Math.max(0, 100 - (percentAllocated - 100) * 2);
    status = "danger";
  } else if (percentAllocated > 95) {
    // Very tight budget
    healthScore = 85;
    status = "warning";
  } else if (percentAllocated > 85) {
    // Well allocated
    healthScore = 95;
    status = "good";
  } else if (percentAllocated < 70) {
    // Under-allocated (might need more budget items)
    healthScore = Math.max(70, 100 - (70 - percentAllocated));
    status = "good";
  }

  return {
    totalAllocated: Math.round(totalAllocated * 100) / 100,
    grossIncome: incomeSource.gross_amount,
    netIncome: incomeSource.net_amount,
    remaining: Math.round(remaining * 100) / 100,
    percentAllocated: Math.round(percentAllocated * 100) / 100,
    healthScore,
    status,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Validate budget item value based on calculation type
 */
export function validateBudgetItemValue(
  calcType: string,
  value: number
): boolean {
  switch (calcType) {
    case "FIXED":
      return value > 0;
    case "GROSS_PERCENT":
    case "NET_PERCENT":
    case "REMAINING_PERCENT":
      return value > 0 && value <= 100;
    default:
      return false;
  }
}

/**
 * Get calculation preview text for display
 */
export function getCalculationPreview(
  budgetItem: Partial<BudgetItem>,
  incomeSource?: IncomeSource,
  remainingIncome?: number
): string {
  if (!budgetItem.calc_type || !budgetItem.value) {
    return "Enter values to see calculation preview";
  }

  if (!incomeSource) {
    return "Select an income source to see calculation preview";
  }

  switch (budgetItem.calc_type) {
    case "FIXED":
      return `${formatCurrency(budgetItem.value)} per pay period`;

    case "GROSS_PERCENT":
      const grossAmount = (incomeSource.gross_amount * budgetItem.value) / 100;
      return `${budgetItem.value}% of ${formatCurrency(
        incomeSource.gross_amount
      )} = ${formatCurrency(grossAmount)}`;

    case "NET_PERCENT":
      const netAmount = (incomeSource.net_amount * budgetItem.value) / 100;
      return `${budgetItem.value}% of ${formatCurrency(
        incomeSource.net_amount
      )} = ${formatCurrency(netAmount)}`;

    case "REMAINING_PERCENT":
      if (remainingIncome === undefined) {
        return `${budgetItem.value}% of remaining income (calculated after dependencies)`;
      }
      const remainingAmount = (remainingIncome * budgetItem.value) / 100;
      return `${budgetItem.value}% of ${formatCurrency(
        remainingIncome
      )} = ${formatCurrency(remainingAmount)}`;

    default:
      return "Unknown calculation type";
  }
}
