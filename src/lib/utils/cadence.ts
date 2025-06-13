import type { IncomeCadence } from "@/types/database";

/**
 * Format income cadence for display
 */
export function formatCadence(cadence: IncomeCadence): string {
  switch (cadence) {
    case "weekly":
      return "Weekly";
    case "bi-weekly":
      return "Bi-weekly";
    case "semi-monthly":
      return "Semi-monthly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
    default:
      return "Unknown";
  }
}

/**
 * Get cadence options for form select
 */
export function getCadenceOptions(): Array<{
  value: IncomeCadence;
  label: string;
}> {
  return [
    { value: "weekly", label: "Weekly" },
    { value: "bi-weekly", label: "Bi-weekly (every 2 weeks)" },
    { value: "semi-monthly", label: "Semi-monthly (twice per month)" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annual", label: "Annual" },
  ];
}

/**
 * Calculate pay periods per year for a given cadence
 */
export function getPayPeriodsPerYear(cadence: IncomeCadence): number {
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
