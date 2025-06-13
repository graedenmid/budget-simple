import type {
  IncomeHistory,
  IncomeChangeType,
  IncomeCadence,
} from "@/types/database";
import { formatCurrency } from "./currency";
import { formatCadence } from "./cadence";

/**
 * Format change type for display
 */
export function formatChangeType(changeType: IncomeChangeType): string {
  switch (changeType) {
    case "CREATED":
      return "Created";
    case "UPDATED":
      return "Updated";
    case "ACTIVATED":
      return "Activated";
    case "DEACTIVATED":
      return "Deactivated";
    case "DELETED":
      return "Deleted";
    default:
      return "Unknown";
  }
}

/**
 * Get change type color for UI
 */
export function getChangeTypeColor(changeType: IncomeChangeType): string {
  switch (changeType) {
    case "CREATED":
      return "text-green-600 bg-green-50 border-green-200";
    case "UPDATED":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "ACTIVATED":
      return "text-green-600 bg-green-50 border-green-200";
    case "DEACTIVATED":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "DELETED":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

/**
 * Get change type icon
 */
export function getChangeTypeIcon(changeType: IncomeChangeType): string {
  switch (changeType) {
    case "CREATED":
      return "Plus";
    case "UPDATED":
      return "Edit";
    case "ACTIVATED":
      return "Power";
    case "DEACTIVATED":
      return "PowerOff";
    case "DELETED":
      return "Trash2";
    default:
      return "Clock";
  }
}

/**
 * Format changed fields for display
 */
export function formatChangedFields(
  changedFields: string[] | null,
  previousValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): string {
  if (!changedFields || changedFields.length === 0) {
    return "No specific changes tracked";
  }

  const changes = changedFields.map((field) => {
    const prevValue = previousValues?.[field];
    const newValue = newValues?.[field];

    switch (field) {
      case "name":
        return `Name: "${String(prevValue)}" → "${String(newValue)}"`;
      case "gross_amount":
        return `Gross: ${formatCurrency(Number(prevValue))} → ${formatCurrency(
          Number(newValue)
        )}`;
      case "net_amount":
        return `Net: ${formatCurrency(Number(prevValue))} → ${formatCurrency(
          Number(newValue)
        )}`;
      case "cadence":
        return `Frequency: ${formatCadence(
          String(prevValue) as IncomeCadence
        )} → ${formatCadence(String(newValue) as IncomeCadence)}`;
      case "start_date":
        return `Start Date: ${new Date(
          String(prevValue)
        ).toLocaleDateString()} → ${new Date(
          String(newValue)
        ).toLocaleDateString()}`;
      case "is_active":
        return `Status: ${Boolean(prevValue) ? "Active" : "Inactive"} → ${
          Boolean(newValue) ? "Active" : "Inactive"
        }`;
      default:
        return `${field}: ${String(prevValue)} → ${String(newValue)}`;
    }
  });

  return changes.join(", ");
}

/**
 * Group income history by date
 */
export function groupHistoryByDate(
  history: IncomeHistory[]
): Record<string, IncomeHistory[]> {
  return history.reduce((groups, item) => {
    const date = new Date(item.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, IncomeHistory[]>);
}

/**
 * Calculate income change percentage
 */
export function calculateIncomeChange(
  previousAmount: number,
  newAmount: number
): { percentage: number; isIncrease: boolean } {
  if (previousAmount === 0) {
    return { percentage: 100, isIncrease: true };
  }

  const change = ((newAmount - previousAmount) / previousAmount) * 100;
  return {
    percentage: Math.abs(change),
    isIncrease: change > 0,
  };
}

/**
 * Get summary statistics for income history
 */
export function getIncomeHistorySummary(history: IncomeHistory[]) {
  const totalChanges = history.length;
  const changeTypes = history.reduce((counts, item) => {
    counts[item.change_type] = (counts[item.change_type] || 0) + 1;
    return counts;
  }, {} as Record<IncomeChangeType, number>);

  const latestChange = history[0];
  const oldestChange = history[history.length - 1];

  return {
    totalChanges,
    changeTypes,
    latestChange,
    oldestChange,
    timeSpan:
      latestChange && oldestChange
        ? Math.ceil(
            (new Date(latestChange.created_at).getTime() -
              new Date(oldestChange.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0,
  };
}
