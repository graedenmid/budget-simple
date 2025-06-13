import type { PayPeriod } from "@/lib/types/pay-periods";

/**
 * Format a date range as a readable string
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  options: {
    format?: "short" | "long";
    separator?: string;
  } = {}
): string {
  const { format = "short", separator = " - " } = options;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatOptions: Intl.DateTimeFormatOptions =
    format === "long"
      ? {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      : {
          month: "short",
          day: "numeric",
          year: "2-digit",
        };

  const startFormatted = start.toLocaleDateString("en-US", formatOptions);
  const endFormatted = end.toLocaleDateString("en-US", formatOptions);

  return `${startFormatted}${separator}${endFormatted}`;
}

/**
 * Check if a pay period is currently active (contains today's date)
 */
export function isPayPeriodActive(payPeriod: PayPeriod): boolean {
  const today = new Date();
  const start = new Date(payPeriod.start_date);
  const end = new Date(payPeriod.end_date);

  // Set time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return today >= start && today <= end;
}

/**
 * Check if a pay period is in the future
 */
export function isPayPeriodUpcoming(payPeriod: PayPeriod): boolean {
  const today = new Date();
  const start = new Date(payPeriod.start_date);

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

/**
 * Check if a pay period is in the past
 */
export function isPayPeriodPast(payPeriod: PayPeriod): boolean {
  const today = new Date();
  const end = new Date(payPeriod.end_date);

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end < today;
}

/**
 * Get the number of days remaining in a pay period
 */
export function getDaysRemaining(payPeriod: PayPeriod): number {
  const today = new Date();
  const end = new Date(payPeriod.end_date);

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get the total duration of a pay period in days
 */
export function getPayPeriodDuration(payPeriod: PayPeriod): number {
  const start = new Date(payPeriod.start_date);
  const end = new Date(payPeriod.end_date);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

  return diffDays;
}

/**
 * Format a single date
 */
export function formatDate(
  date: string | Date,
  format: "short" | "long" | "medium" = "medium"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const formatOptions: Intl.DateTimeFormatOptions = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  }[format] as Intl.DateTimeFormatOptions;

  return dateObj.toLocaleDateString("en-US", formatOptions);
}

/**
 * Get relative time description for a pay period
 */
export function getRelativeTimeDescription(payPeriod: PayPeriod): string {
  if (isPayPeriodActive(payPeriod)) {
    const daysRemaining = getDaysRemaining(payPeriod);
    if (daysRemaining === 0) {
      return "Ends today";
    } else if (daysRemaining === 1) {
      return "Ends tomorrow";
    } else {
      return `${daysRemaining} days remaining`;
    }
  } else if (isPayPeriodUpcoming(payPeriod)) {
    return "Upcoming";
  } else {
    return "Completed";
  }
}
