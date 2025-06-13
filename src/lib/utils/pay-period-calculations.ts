import {
  IncomeCadence,
  PayPeriodCalculation,
  CADENCE_CONFIG,
  PayPeriodValidationResult,
} from "@/lib/types/pay-periods";

/**
 * Calculate the next pay period dates based on cadence and start date
 */
export function calculateNextPayPeriod(
  cadence: IncomeCadence,
  lastPeriodEndDate: Date,
  expectedNet: number
): PayPeriodCalculation {
  const startDate = new Date(lastPeriodEndDate);
  startDate.setDate(startDate.getDate() + 1); // Start the day after the last period ended

  let endDate: Date;

  switch (cadence) {
    case "weekly":
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      break;

    case "bi-weekly":
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      break;

    case "semi-monthly":
      // Semi-monthly: 1st-15th, 16th-end of month
      if (startDate.getDate() === 1) {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), 15);
      } else {
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        ); // Last day of month
      }
      break;

    case "monthly":
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of month
      break;

    case "quarterly":
      // End of quarter (March 31, June 30, September 30, December 31)
      const currentQuarter = Math.floor(startDate.getMonth() / 3);
      const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
      endDate = new Date(startDate.getFullYear(), quarterEndMonth + 1, 0);
      break;

    case "annual":
      endDate = new Date(startDate.getFullYear(), 11, 31); // December 31
      break;

    default:
      throw new Error(`Unsupported cadence: ${cadence}`);
  }

  const daysInPeriod =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return {
    start_date: startDate,
    end_date: endDate,
    expected_net: expectedNet,
    days_in_period: daysInPeriod,
  };
}

/**
 * Calculate the first pay period dates based on cadence and income start date
 */
export function calculateFirstPayPeriod(
  cadence: IncomeCadence,
  incomeStartDate: Date,
  expectedNet: number
): PayPeriodCalculation {
  const startDate = new Date(incomeStartDate);
  let endDate: Date;

  switch (cadence) {
    case "weekly":
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      break;

    case "bi-weekly":
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      break;

    case "semi-monthly":
      // Determine if we start on 1st or 16th
      if (startDate.getDate() <= 15) {
        // Start period on 1st, end on 15th
        startDate.setDate(1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), 15);
      } else {
        // Start period on 16th, end on last day of month
        startDate.setDate(16);
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
      }
      break;

    case "monthly":
      // Start from the 1st of the month
      startDate.setDate(1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      break;

    case "quarterly":
      // Start from the beginning of the quarter
      const quarterStartMonth = Math.floor(startDate.getMonth() / 3) * 3;
      startDate.setMonth(quarterStartMonth, 1);
      endDate = new Date(startDate.getFullYear(), quarterStartMonth + 3, 0);
      break;

    case "annual":
      // Start from January 1st
      startDate.setMonth(0, 1);
      endDate = new Date(startDate.getFullYear(), 11, 31);
      break;

    default:
      throw new Error(`Unsupported cadence: ${cadence}`);
  }

  const daysInPeriod =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return {
    start_date: startDate,
    end_date: endDate,
    expected_net: expectedNet,
    days_in_period: daysInPeriod,
  };
}

/**
 * Get all pay periods between two dates
 */
export function generatePayPeriodsBetweenDates(
  cadence: IncomeCadence,
  startDate: Date,
  endDate: Date,
  expectedNet: number
): PayPeriodCalculation[] {
  const periods: PayPeriodCalculation[] = [];
  let currentPeriod = calculateFirstPayPeriod(cadence, startDate, expectedNet);

  while (currentPeriod.start_date <= endDate) {
    periods.push(currentPeriod);

    // Calculate next period
    try {
      currentPeriod = calculateNextPayPeriod(
        cadence,
        currentPeriod.end_date,
        expectedNet
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // If we can't calculate the next period, break the loop
      break;
    }
  }

  return periods;
}

/**
 * Validate pay period dates and configuration
 */
export function validatePayPeriod(
  startDate: Date,
  endDate: Date,
  cadence: IncomeCadence,
  expectedNet: number
): PayPeriodValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic date validation
  if (startDate >= endDate) {
    errors.push("Start date must be before end date");
  }

  // Expected net validation
  if (expectedNet <= 0) {
    errors.push("Expected net amount must be greater than zero");
  }

  // Cadence-specific validation
  const daysInPeriod =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const expectedDays = CADENCE_CONFIG[cadence].days_between_periods;

  // Allow some flexibility for different cadences
  const tolerance =
    cadence === "monthly" || cadence === "quarterly" || cadence === "annual"
      ? 5
      : 1;

  if (Math.abs(daysInPeriod - expectedDays) > tolerance) {
    warnings.push(
      `Period length (${daysInPeriod} days) differs significantly from expected for ${cadence} cadence (${expectedDays} days)`
    );
  }

  // Check for reasonable date ranges
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  const oneYearFromNow = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate()
  );

  if (startDate < oneYearAgo) {
    warnings.push("Pay period starts more than a year ago");
  }

  if (endDate > oneYearFromNow) {
    warnings.push("Pay period ends more than a year in the future");
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get the current active pay period date range for a given cadence
 */
export function getCurrentPayPeriodRange(cadence: IncomeCadence): {
  start: Date;
  end: Date;
} {
  const now = new Date();

  switch (cadence) {
    case "weekly":
      // Week starts on Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };

    case "bi-weekly":
      // Find the start of the current bi-weekly period
      const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
      const biWeeklyPeriod = Math.floor(daysSinceEpoch / 14);
      const biWeeklyStart = new Date(biWeeklyPeriod * 14 * 24 * 60 * 60 * 1000);
      const biWeeklyEnd = new Date(
        biWeeklyStart.getTime() + 13 * 24 * 60 * 60 * 1000
      );
      return { start: biWeeklyStart, end: biWeeklyEnd };

    case "semi-monthly":
      if (now.getDate() <= 15) {
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth(), 15),
        };
      } else {
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 16),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      }

    case "monthly":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };

    case "quarterly":
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStartMonth, 1),
        end: new Date(now.getFullYear(), quarterStartMonth + 3, 0),
      };

    case "annual":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };

    default:
      throw new Error(`Unsupported cadence: ${cadence}`);
  }
}

/**
 * Check if a date falls within a pay period
 */
export function isDateInPayPeriod(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Calculate pro-rated amount for partial periods
 */
export function calculateProRatedAmount(
  fullAmount: number,
  actualDays: number,
  expectedDays: number
): number {
  if (expectedDays === 0) return 0;
  return (fullAmount * actualDays) / expectedDays;
}
