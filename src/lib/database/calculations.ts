import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type BudgetItem = Tables["budget_items"]["Row"];
type IncomeSource = Tables["income_sources"]["Row"];
type PayPeriod = Tables["pay_periods"]["Row"];
type Allocation = Tables["allocations"]["Row"];

// Income cadence calculations
export function calculatePayPeriodsPerYear(
  cadence: Database["public"]["Enums"]["income_cadence"]
): number {
  switch (cadence) {
    case "weekly":
      return 52;
    case "bi-weekly":
      return 26;
    case "semi-monthly":
      return 24;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annual":
      return 1;
    default:
      return 12;
  }
}

export function calculateDaysBetweenPayPeriods(
  cadence: Database["public"]["Enums"]["income_cadence"]
): number {
  switch (cadence) {
    case "weekly":
      return 7;
    case "bi-weekly":
      return 14;
    case "semi-monthly":
      return 15.2; // Approximately 365/24
    case "monthly":
      return 30.4; // Approximately 365/12
    case "quarterly":
      return 91.3; // Approximately 365/4
    case "annual":
      return 365;
    default:
      return 30.4;
  }
}

// Budget item allocation calculations
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

// Pay period calculation utilities
export function calculateNextPayDate(
  lastPayDate: Date,
  cadence: Database["public"]["Enums"]["income_cadence"]
): Date {
  const nextDate = new Date(lastPayDate);
  const days = calculateDaysBetweenPayPeriods(cadence);

  if (cadence === "semi-monthly") {
    // Special handling for semi-monthly (15th and last day of month)
    const day = lastPayDate.getDate();
    if (day <= 15) {
      // Next pay is last day of month
      nextDate.setMonth(nextDate.getMonth() + 1, 0); // Last day of current month
    } else {
      // Next pay is 15th of next month
      nextDate.setMonth(nextDate.getMonth() + 1, 15);
    }
  } else {
    nextDate.setDate(nextDate.getDate() + Math.round(days));
  }

  return nextDate;
}

export function calculatePayPeriodDates(
  startDate: Date,
  cadence: Database["public"]["Enums"]["income_cadence"]
): { startDate: Date; endDate: Date } {
  const start = new Date(startDate);
  const end = calculateNextPayDate(start, cadence);

  // End date is one day before next pay period starts
  end.setDate(end.getDate() - 1);

  return { startDate: start, endDate: end };
}

// Allocation and surplus calculations
export function calculateTotalAllocations(allocations: Allocation[]): {
  expectedTotal: number;
  actualTotal: number;
  paidCount: number;
  unpaidCount: number;
} {
  let expectedTotal = 0;
  let actualTotal = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  allocations.forEach((allocation) => {
    expectedTotal += Number(allocation.expected_amount);

    if (allocation.status === "PAID") {
      actualTotal += Number(
        allocation.actual_amount || allocation.expected_amount
      );
      paidCount++;
    } else {
      unpaidCount++;
    }
  });

  return {
    expectedTotal,
    actualTotal,
    paidCount,
    unpaidCount,
  };
}

export function calculateSurplusAmount(
  payPeriod: PayPeriod,
  allocations: Allocation[]
): number {
  const netIncome = Number(payPeriod.actual_net || payPeriod.expected_net);
  const { expectedTotal } = calculateTotalAllocations(allocations);

  return Math.max(0, netIncome - expectedTotal);
}

export function calculateBudgetHealth(
  payPeriod: PayPeriod,
  allocations: Allocation[]
): {
  healthScore: number; // 0-100
  status: "excellent" | "good" | "warning" | "danger";
  netIncome: number;
  totalAllocated: number;
  remaining: number;
  percentAllocated: number;
} {
  const netIncome = Number(payPeriod.actual_net || payPeriod.expected_net);
  const { expectedTotal } = calculateTotalAllocations(allocations);
  const remaining = netIncome - expectedTotal;
  const percentAllocated =
    netIncome > 0 ? (expectedTotal / netIncome) * 100 : 0;

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
    healthScore,
    status,
    netIncome,
    totalAllocated: expectedTotal,
    remaining,
    percentAllocated,
  };
}

// Budget item dependency resolution
export function resolveBudgetItemDependencies(
  budgetItems: BudgetItem[]
): BudgetItem[] {
  const resolved: BudgetItem[] = [];
  const pending = [...budgetItems];
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

// Prorated calculations for partial pay periods
export function calculateProratedAmount(
  fullAmount: number,
  totalDays: number,
  actualDays: number
): number {
  if (totalDays <= 0 || actualDays <= 0) return 0;
  return (fullAmount * actualDays) / totalDays;
}

export function calculatePartialPayPeriodAllocation(
  budgetItem: BudgetItem,
  incomeSource: IncomeSource,
  payPeriodStart: Date,
  payPeriodEnd: Date,
  fullPayPeriodDays: number,
  remainingIncome?: number
): number {
  const fullAllocation = calculateBudgetItemAllocation(
    budgetItem,
    incomeSource,
    remainingIncome
  );
  const actualDays =
    Math.ceil(
      (payPeriodEnd.getTime() - payPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return calculateProratedAmount(fullAllocation, fullPayPeriodDays, actualDays);
}

// Format currency for display
export function formatCurrency(amount: number, includeSign = false): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (includeSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return formatted;
}

// Calculate percentage with proper rounding
export function calculatePercentage(
  part: number,
  whole: number,
  decimals = 1
): number {
  if (whole === 0) return 0;
  const percentage = (part / whole) * 100;
  return (
    Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals)
  );
}
