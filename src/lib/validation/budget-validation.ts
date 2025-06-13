import type { BudgetItem, IncomeSource } from "@/types/database";
import {
  calculateBudgetAllocations,
  calculateBudgetSummary,
} from "@/lib/calculations/budget-calculations";

export interface ValidationIssue {
  id: string;
  type: "error" | "warning" | "info";
  category:
    | "dependency"
    | "calculation"
    | "allocation"
    | "conflict"
    | "performance";
  title: string;
  message: string;
  affectedItems: string[];
  suggestedFix?: string;
  autoFixable?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    totalAllocation: number;
    remainingIncome: number;
    allocationPercentage: number;
  };
}

export interface ConflictResolution {
  type:
    | "adjust_values"
    | "reorder_priorities"
    | "remove_dependencies"
    | "split_items";
  description: string;
  changes: Array<{
    itemId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

/**
 * Comprehensive budget validation
 */
export function validateBudgetItems(
  budgetItems: BudgetItem[],
  incomeSources: IncomeSource[]
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const activeItems = budgetItems.filter((item) => item.is_active);
  const activeIncome = incomeSources.filter((source) => source.is_active);

  if (activeIncome.length === 0) {
    issues.push({
      id: "no-income",
      type: "error",
      category: "calculation",
      title: "No Active Income Sources",
      message:
        "At least one active income source is required for budget calculations.",
      affectedItems: [],
      suggestedFix: "Add or activate an income source",
      autoFixable: false,
    });
  }

  if (activeItems.length === 0) {
    issues.push({
      id: "no-budget-items",
      type: "info",
      category: "allocation",
      title: "No Budget Items",
      message:
        "No active budget items found. Your entire income will be unallocated.",
      affectedItems: [],
      suggestedFix: "Add budget items to allocate your income",
      autoFixable: false,
    });
  }

  // Validate individual items
  activeItems.forEach((item) => {
    validateIndividualItem(item, issues);
  });

  // Validate dependencies
  validateDependencies(activeItems, issues);

  // Validate allocations if we have income
  if (activeIncome.length > 0 && activeItems.length > 0) {
    validateAllocations(activeItems, activeIncome[0], issues);
  }

  // Validate conflicts
  validateConflicts(activeItems, issues);

  // Calculate summary
  let totalAllocation = 0;
  let remainingIncome = 0;
  let allocationPercentage = 0;

  if (activeIncome.length > 0 && activeItems.length > 0) {
    try {
      const allocations = calculateBudgetAllocations(
        activeItems,
        activeIncome[0]
      );
      const summary = calculateBudgetSummary(allocations, activeIncome[0]);
      totalAllocation = summary.totalAllocated;
      remainingIncome = summary.remaining;
      allocationPercentage = summary.percentAllocated;
    } catch (error) {
      issues.push({
        id: "calculation-error",
        type: "error",
        category: "calculation",
        title: "Calculation Error",
        message: `Failed to calculate budget allocations: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        affectedItems: activeItems.map((item) => item.id),
        suggestedFix: "Check for circular dependencies or invalid values",
        autoFixable: false,
      });
    }
  }

  const errorCount = issues.filter((issue) => issue.type === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.type === "warning"
  ).length;
  const infoCount = issues.filter((issue) => issue.type === "info").length;

  return {
    isValid: errorCount === 0,
    issues,
    summary: {
      errorCount,
      warningCount,
      infoCount,
      totalAllocation,
      remainingIncome,
      allocationPercentage,
    },
  };
}

/**
 * Validate individual budget item
 */
function validateIndividualItem(
  item: BudgetItem,
  issues: ValidationIssue[]
): void {
  // Value validation
  if (item.value <= 0) {
    issues.push({
      id: `invalid-value-${item.id}`,
      type: "error",
      category: "calculation",
      title: "Invalid Value",
      message: `"${item.name}" has an invalid value of ${item.value}`,
      affectedItems: [item.id],
      suggestedFix: "Set a positive value greater than 0",
      autoFixable: false,
    });
  }

  // Percentage validation
  if (
    ["GROSS_PERCENT", "NET_PERCENT", "REMAINING_PERCENT"].includes(
      item.calc_type
    )
  ) {
    if (item.value > 100) {
      issues.push({
        id: `percentage-too-high-${item.id}`,
        type: "error",
        category: "calculation",
        title: "Percentage Too High",
        message: `"${item.name}" has a percentage of ${item.value}% which exceeds 100%`,
        affectedItems: [item.id],
        suggestedFix: "Reduce percentage to 100% or less",
        autoFixable: true,
      });
    }

    if (item.value > 50) {
      issues.push({
        id: `high-percentage-${item.id}`,
        type: "warning",
        category: "allocation",
        title: "High Percentage Allocation",
        message: `"${item.name}" allocates ${item.value}% of income, which is quite high`,
        affectedItems: [item.id],
        suggestedFix:
          "Consider if this percentage is appropriate for your budget",
        autoFixable: false,
      });
    }
  }

  // REMAINING_PERCENT validation
  if (item.calc_type === "REMAINING_PERCENT") {
    if (!item.depends_on || item.depends_on.length === 0) {
      issues.push({
        id: `missing-dependencies-${item.id}`,
        type: "error",
        category: "dependency",
        title: "Missing Dependencies",
        message: `"${item.name}" uses REMAINING_PERCENT but has no dependencies`,
        affectedItems: [item.id],
        suggestedFix: "Add dependencies or change calculation type",
        autoFixable: false,
      });
    }
  }

  // Name validation
  if (item.name.trim().length < 2) {
    issues.push({
      id: `short-name-${item.id}`,
      type: "warning",
      category: "allocation",
      title: "Short Name",
      message: `"${item.name}" has a very short name`,
      affectedItems: [item.id],
      suggestedFix: "Use a more descriptive name",
      autoFixable: false,
    });
  }
}

/**
 * Validate dependencies
 */
function validateDependencies(
  items: BudgetItem[],
  issues: ValidationIssue[]
): void {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  items.forEach((item) => {
    if (item.depends_on && item.depends_on.length > 0) {
      // Check for missing dependencies
      item.depends_on.forEach((depId) => {
        if (!itemMap.has(depId)) {
          issues.push({
            id: `missing-dependency-${item.id}-${depId}`,
            type: "error",
            category: "dependency",
            title: "Missing Dependency",
            message: `"${item.name}" depends on a non-existent or inactive budget item`,
            affectedItems: [item.id],
            suggestedFix: "Remove the dependency or activate the required item",
            autoFixable: true,
          });
        }
      });

      // Check for self-dependency
      if (item.depends_on.includes(item.id)) {
        issues.push({
          id: `self-dependency-${item.id}`,
          type: "error",
          category: "dependency",
          title: "Self Dependency",
          message: `"${item.name}" depends on itself`,
          affectedItems: [item.id],
          suggestedFix: "Remove self-dependency",
          autoFixable: true,
        });
      }

      // Check for priority conflicts
      item.depends_on.forEach((depId) => {
        const dependency = itemMap.get(depId);
        if (dependency && dependency.priority >= item.priority) {
          issues.push({
            id: `priority-conflict-${item.id}-${depId}`,
            type: "warning",
            category: "dependency",
            title: "Priority Conflict",
            message: `"${item.name}" should have higher priority than "${dependency.name}"`,
            affectedItems: [item.id, depId],
            suggestedFix:
              "Adjust priorities so dependencies are calculated first",
            autoFixable: true,
          });
        }
      });
    }
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCircularDependency(itemId: string): boolean {
    if (recursionStack.has(itemId)) {
      return true;
    }
    if (visited.has(itemId)) {
      return false;
    }

    visited.add(itemId);
    recursionStack.add(itemId);

    const item = itemMap.get(itemId);
    if (item?.depends_on) {
      for (const depId of item.depends_on) {
        if (hasCircularDependency(depId)) {
          return true;
        }
      }
    }

    recursionStack.delete(itemId);
    return false;
  }

  items.forEach((item) => {
    if (hasCircularDependency(item.id)) {
      issues.push({
        id: `circular-dependency-${item.id}`,
        type: "error",
        category: "dependency",
        title: "Circular Dependency",
        message: `"${item.name}" is part of a circular dependency chain`,
        affectedItems: [item.id],
        suggestedFix: "Remove dependencies to break the circular chain",
        autoFixable: false,
      });
    }
  });
}

/**
 * Validate allocations
 */
function validateAllocations(
  items: BudgetItem[],
  incomeSource: IncomeSource,
  issues: ValidationIssue[]
): void {
  try {
    const allocations = calculateBudgetAllocations(items, incomeSource);
    const summary = calculateBudgetSummary(allocations, incomeSource);

    // Over-allocation warning
    if (summary.percentAllocated > 100) {
      issues.push({
        id: "over-allocation",
        type: "warning",
        category: "allocation",
        title: "Over-Allocation",
        message: `Budget items allocate ${summary.percentAllocated.toFixed(
          1
        )}% of income (${summary.totalAllocated.toFixed(2)} of ${
          incomeSource.net_amount
        })`,
        affectedItems: items.map((item) => item.id),
        suggestedFix: "Reduce allocation amounts or percentages",
        autoFixable: false,
      });
    }

    // Under-allocation info
    if (summary.percentAllocated < 80) {
      issues.push({
        id: "under-allocation",
        type: "info",
        category: "allocation",
        title: "Under-Allocation",
        message: `Only ${summary.percentAllocated.toFixed(
          1
        )}% of income is allocated. ${summary.remaining.toFixed(
          2
        )} remains unallocated`,
        affectedItems: [],
        suggestedFix:
          "Consider adding more budget items or increasing allocations",
        autoFixable: false,
      });
    }

    // Zero allocations
    allocations.forEach((allocation) => {
      if (allocation.expectedAmount === 0) {
        const item = items.find((i) => i.id === allocation.budgetItemId);
        if (item) {
          issues.push({
            id: `zero-allocation-${item.id}`,
            type: "warning",
            category: "calculation",
            title: "Zero Allocation",
            message: `"${item.name}" results in zero allocation`,
            affectedItems: [item.id],
            suggestedFix: "Check calculation type and value",
            autoFixable: false,
          });
        }
      }
    });
  } catch (error) {
    issues.push({
      id: "allocation-calculation-error",
      type: "error",
      category: "calculation",
      title: "Allocation Calculation Error",
      message: `Failed to calculate allocations: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      affectedItems: items.map((item) => item.id),
      suggestedFix: "Check for invalid values or circular dependencies",
      autoFixable: false,
    });
  }
}

/**
 * Validate conflicts between items
 */
function validateConflicts(
  items: BudgetItem[],
  issues: ValidationIssue[]
): void {
  // Check for duplicate names
  const nameMap = new Map<string, BudgetItem[]>();
  items.forEach((item) => {
    const normalizedName = item.name.toLowerCase().trim();
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(item);
  });

  nameMap.forEach((duplicateItems, name) => {
    if (duplicateItems.length > 1) {
      issues.push({
        id: `duplicate-names-${name}`,
        type: "warning",
        category: "conflict",
        title: "Duplicate Names",
        message: `Multiple budget items have the same name: "${duplicateItems[0].name}"`,
        affectedItems: duplicateItems.map((item) => item.id),
        suggestedFix: "Use unique names for each budget item",
        autoFixable: false,
      });
    }
  });

  // Check for conflicting priorities
  const priorityMap = new Map<number, BudgetItem[]>();
  items.forEach((item) => {
    if (!priorityMap.has(item.priority)) {
      priorityMap.set(item.priority, []);
    }
    priorityMap.get(item.priority)!.push(item);
  });

  priorityMap.forEach((sameItems, priority) => {
    if (sameItems.length > 1) {
      issues.push({
        id: `same-priority-${priority}`,
        type: "info",
        category: "conflict",
        title: "Same Priority",
        message: `Multiple items have priority ${priority}: ${sameItems
          .map((i) => i.name)
          .join(", ")}`,
        affectedItems: sameItems.map((item) => item.id),
        suggestedFix: "Assign unique priorities for better control",
        autoFixable: true,
      });
    }
  });
}

/**
 * Generate conflict resolutions
 */
export function generateConflictResolutions(
  issues: ValidationIssue[],
  budgetItems: BudgetItem[]
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = [];

  issues.forEach((issue) => {
    if (issue.autoFixable) {
      switch (issue.id.split("-")[0]) {
        case "percentage":
          if (issue.id.includes("too-high")) {
            resolutions.push({
              type: "adjust_values",
              description: `Reduce ${issue.affectedItems.length} item(s) to 100% or less`,
              changes: issue.affectedItems.map((itemId) => ({
                itemId,
                field: "value",
                oldValue: budgetItems.find((i) => i.id === itemId)?.value,
                newValue: 100,
              })),
            });
          }
          break;

        case "priority":
          if (issue.id.includes("conflict")) {
            resolutions.push({
              type: "reorder_priorities",
              description:
                "Automatically reorder priorities based on dependencies",
              changes: [], // Would be calculated based on dependency chain
            });
          }
          break;

        case "missing":
          if (issue.id.includes("dependency")) {
            resolutions.push({
              type: "remove_dependencies",
              description: "Remove invalid dependencies",
              changes: issue.affectedItems.map((itemId) => {
                const item = budgetItems.find((i) => i.id === itemId);
                return {
                  itemId,
                  field: "depends_on",
                  oldValue: item?.depends_on,
                  newValue: [],
                };
              }),
            });
          }
          break;

        case "self":
          if (issue.id.includes("dependency")) {
            resolutions.push({
              type: "remove_dependencies",
              description: "Remove self-dependencies",
              changes: issue.affectedItems.map((itemId) => {
                const item = budgetItems.find((i) => i.id === itemId);
                return {
                  itemId,
                  field: "depends_on",
                  oldValue: item?.depends_on,
                  newValue:
                    item?.depends_on?.filter((id) => id !== itemId) || [],
                };
              }),
            });
          }
          break;

        case "same":
          if (issue.id.includes("priority")) {
            resolutions.push({
              type: "reorder_priorities",
              description: "Assign unique priorities",
              changes: issue.affectedItems.map((itemId, index) => ({
                itemId,
                field: "priority",
                oldValue: budgetItems.find((i) => i.id === itemId)?.priority,
                newValue:
                  (budgetItems.find((i) => i.id === itemId)?.priority || 0) +
                  index,
              })),
            });
          }
          break;
      }
    }
  });

  return resolutions;
}

/**
 * Apply conflict resolution
 */
export function applyConflictResolution(
  resolution: ConflictResolution,
  budgetItems: BudgetItem[]
): BudgetItem[] {
  const updatedItems = [...budgetItems];

  resolution.changes.forEach((change) => {
    const itemIndex = updatedItems.findIndex(
      (item) => item.id === change.itemId
    );
    if (itemIndex !== -1) {
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        [change.field]: change.newValue,
      };
    }
  });

  return updatedItems;
}
