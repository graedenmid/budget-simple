import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Types for the calculation engine
interface BudgetItem {
  id: string;
  name: string;
  category: string;
  calc_type: "FIXED" | "GROSS_PERCENT" | "NET_PERCENT" | "REMAINING_PERCENT";
  value: number;
  cadence: string;
  depends_on: string[] | null;
  priority: number;
  is_active: boolean;
}

interface IncomeSource {
  id: string;
  name: string;
  gross_amount: number;
  net_amount: number;
  cadence: string;
}

interface AllocationCalculationResult {
  budget_item_id: string;
  expected_amount: number;
  calculation_details: {
    base_amount: number;
    calculation_type: string;
    percentage?: number;
    dependency_total?: number;
    pro_rated_factor?: number;
    notes?: string;
  };
}

interface AllocationCalculationRequest {
  pay_period_id: string;
  budget_items: BudgetItem[];
  income_source: IncomeSource;
  pro_rate_factor?: number;
  config?: {
    enable_pro_rating?: boolean;
    handle_rounding?: "up" | "down" | "nearest";
    max_iterations?: number;
    precision_decimals?: number;
  };
}

interface AllocationCalculationResponse {
  success: boolean;
  pay_period_id: string;
  allocations: AllocationCalculationResult[];
  summary: {
    total_allocated: number;
    total_remaining: number;
    items_processed: number;
    calculation_errors: string[];
  };
  calculation_order: string[];
  timestamp: string;
}

// Default configuration
const DEFAULT_CONFIG = {
  enable_pro_rating: true,
  handle_rounding: "nearest" as const,
  max_iterations: 10,
  precision_decimals: 2,
};

/**
 * Round amount based on configuration
 */
function roundAmount(amount: number, config: typeof DEFAULT_CONFIG): number {
  const factor = Math.pow(10, config.precision_decimals);

  switch (config.handle_rounding) {
    case "up":
      return Math.ceil(amount * factor) / factor;
    case "down":
      return Math.floor(amount * factor) / factor;
    case "nearest":
    default:
      return Math.round(amount * factor) / factor;
  }
}

/**
 * Calculate income cadence factor for pro-rating
 */
function calculateProRateFactor(
  itemCadence: string,
  incomeCadence: string,
  customFactor?: number
): number {
  if (customFactor !== undefined) {
    return customFactor;
  }

  // If cadences match, no pro-rating needed
  if (itemCadence === incomeCadence) {
    return 1;
  }

  // Convert to days for calculation
  const cadenceToDays: Record<string, number> = {
    weekly: 7,
    "bi-weekly": 14,
    "semi-monthly": 15.22, // Approximately 365.25 / 24
    monthly: 30.44, // Approximately 365.25 / 12
    quarterly: 91.31, // Approximately 365.25 / 4
    annual: 365.25,
  };

  const itemDays = cadenceToDays[itemCadence] || 30.44;
  const incomeDays = cadenceToDays[incomeCadence] || 30.44;

  return incomeDays / itemDays;
}

/**
 * Resolve budget item dependencies to ensure proper calculation order
 */
function resolveBudgetItemDependencies(
  budgetItems: BudgetItem[]
): BudgetItem[] {
  const resolved: BudgetItem[] = [];
  const pending = [...budgetItems.filter((item) => item.is_active)];
  const resolvedIds = new Set<string>();

  // Sort by priority first
  pending.sort((a, b) => a.priority - b.priority);

  let iterations = 0;
  const maxIterations = DEFAULT_CONFIG.max_iterations;

  while (pending.length > 0 && iterations < maxIterations) {
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
        pending.map((item) => `${item.name} (${item.id})`)
      );
      // Add remaining items anyway but mark as having dependency issues
      resolved.push(...pending);
      break;
    }

    iterations++;
  }

  return resolved;
}

/**
 * Calculate allocation for a single budget item
 */
function calculateSingleAllocation(
  budgetItem: BudgetItem,
  incomeSource: IncomeSource,
  existingAllocations: AllocationCalculationResult[],
  config: typeof DEFAULT_CONFIG,
  customProRateFactor?: number
): AllocationCalculationResult {
  let expectedAmount = 0;
  const calculationDetails: AllocationCalculationResult["calculation_details"] =
    {
      base_amount: 0,
      calculation_type: budgetItem.calc_type,
    };

  // Calculate pro-rate factor if enabled
  const proRateFactor = config.enable_pro_rating
    ? calculateProRateFactor(
        budgetItem.cadence,
        incomeSource.cadence,
        customProRateFactor
      )
    : 1;

  if (proRateFactor !== 1) {
    calculationDetails.pro_rated_factor = proRateFactor;
    calculationDetails.notes = `Pro-rated from ${budgetItem.cadence} to ${incomeSource.cadence}`;
  }

  switch (budgetItem.calc_type) {
    case "FIXED":
      expectedAmount = budgetItem.value * proRateFactor;
      calculationDetails.base_amount = budgetItem.value;
      break;

    case "GROSS_PERCENT":
      expectedAmount =
        (incomeSource.gross_amount * budgetItem.value * proRateFactor) / 100;
      calculationDetails.base_amount = incomeSource.gross_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "NET_PERCENT":
      expectedAmount =
        (incomeSource.net_amount * budgetItem.value * proRateFactor) / 100;
      calculationDetails.base_amount = incomeSource.net_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "REMAINING_PERCENT":
      // Calculate total of dependencies
      const dependentTotal =
        budgetItem.depends_on?.reduce((total, depId) => {
          const depAllocation = existingAllocations.find(
            (a) => a.budget_item_id === depId
          );
          return total + (depAllocation?.expected_amount || 0);
        }, 0) || 0;

      const remainingAmount = incomeSource.net_amount - dependentTotal;
      expectedAmount =
        (remainingAmount * budgetItem.value * proRateFactor) / 100;

      calculationDetails.base_amount = remainingAmount;
      calculationDetails.percentage = budgetItem.value;
      calculationDetails.dependency_total = dependentTotal;

      if (remainingAmount < 0) {
        calculationDetails.notes = `Warning: Remaining amount is negative (${remainingAmount.toFixed(
          2
        )})`;
      }
      break;

    default:
      console.warn(`Unknown calculation type: ${budgetItem.calc_type}`);
      expectedAmount = 0;
      calculationDetails.notes = `Error: Unknown calculation type ${budgetItem.calc_type}`;
  }

  // Apply rounding
  expectedAmount = roundAmount(expectedAmount, config);

  // Ensure non-negative amounts
  if (expectedAmount < 0) {
    expectedAmount = 0;
    calculationDetails.notes =
      (calculationDetails.notes || "") +
      " Amount adjusted to zero (was negative).";
  }

  return {
    budget_item_id: budgetItem.id,
    expected_amount: expectedAmount,
    calculation_details,
  };
}

/**
 * Calculate allocations for all budget items
 */
function calculateBudgetAllocations(
  request: AllocationCalculationRequest
): AllocationCalculationResponse {
  const config = { ...DEFAULT_CONFIG, ...request.config };
  const timestamp = new Date().toISOString();

  // Resolve dependencies and sort by priority
  const sortedItems = resolveBudgetItemDependencies(request.budget_items);
  const results: AllocationCalculationResult[] = [];
  const calculationErrors: string[] = [];

  // Calculate each item in dependency order
  for (const item of sortedItems) {
    try {
      const result = calculateSingleAllocation(
        item,
        request.income_source,
        results,
        config,
        request.pro_rate_factor
      );
      results.push(result);
    } catch (error) {
      const errorMessage = `Failed to calculate allocation for ${item.name}: ${error.message}`;
      console.error(errorMessage, error);
      calculationErrors.push(errorMessage);

      // Add a zero allocation for failed items
      results.push({
        budget_item_id: item.id,
        expected_amount: 0,
        calculation_details: {
          base_amount: 0,
          calculation_type: item.calc_type,
          notes: `Calculation failed: ${error.message}`,
        },
      });
    }
  }

  // Calculate summary
  const totalAllocated = results.reduce(
    (sum, result) => sum + result.expected_amount,
    0
  );
  const totalRemaining = request.income_source.net_amount - totalAllocated;

  return {
    success: calculationErrors.length === 0,
    pay_period_id: request.pay_period_id,
    allocations: results,
    summary: {
      total_allocated: roundAmount(totalAllocated, config),
      total_remaining: roundAmount(totalRemaining, config),
      items_processed: results.length,
      calculation_errors: calculationErrors,
    },
    calculation_order: sortedItems.map((item) => item.id),
    timestamp,
  };
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const request: AllocationCalculationRequest = await req.json();

    // Validate required fields
    if (
      !request.pay_period_id ||
      !request.budget_items ||
      !request.income_source
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message:
              "Missing required fields: pay_period_id, budget_items, income_source",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate pay period exists (optional security check)
    const { data: payPeriod, error: payPeriodError } = await supabase
      .from("pay_periods")
      .select("id")
      .eq("id", request.pay_period_id)
      .single();

    if (payPeriodError || !payPeriod) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "PAY_PERIOD_NOT_FOUND",
            message: "Pay period not found",
          },
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate allocations
    const response = calculateBudgetAllocations(request);

    // Return successful response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Allocation calculation error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "CALCULATION_ERROR",
          message: "Failed to calculate allocations",
          details: error.message,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
