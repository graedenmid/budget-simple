import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface BudgetItem {
  id: string;
  name: string;
  category: string;
  calc_type: "FIXED" | "GROSS_PERCENT" | "NET_PERCENT" | "REMAINING_PERCENT";
  value: number;
  cadence: string;
  depends_on: string[];
  priority: number;
  is_active: boolean;
}

interface IncomeSource {
  id: string;
  gross_amount: number;
  net_amount: number;
  cadence: string;
}

interface CalculationRequest {
  user_id: string;
  income_source_id: string;
  pay_period_start: string;
  pay_period_end: string;
}

interface AllocationResult {
  budget_item_id: string;
  expected_amount: number;
  calculation_details: {
    base_amount: number;
    calculation_type: string;
    percentage?: number;
    depends_on_total?: number;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      user_id,
      income_source_id,
      pay_period_start,
      pay_period_end,
    }: CalculationRequest = await req.json();

    if (!user_id || !income_source_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get income source details
    const { data: incomeSource, error: incomeError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("id", income_source_id)
      .eq("user_id", user_id)
      .single();

    if (incomeError || !incomeSource) {
      return new Response(
        JSON.stringify({ error: "Income source not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get active budget items for user, ordered by priority
    const { data: budgetItems, error: budgetError } = await supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (budgetError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch budget items" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate allocations
    const allocations = calculateBudgetAllocations(
      budgetItems || [],
      incomeSource
    );

    return new Response(
      JSON.stringify({
        success: true,
        allocations,
        summary: {
          total_allocated: allocations.reduce(
            (sum, alloc) => sum + alloc.expected_amount,
            0
          ),
          gross_income: incomeSource.gross_amount,
          net_income: incomeSource.net_amount,
          remaining:
            incomeSource.net_amount -
            allocations.reduce((sum, alloc) => sum + alloc.expected_amount, 0),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Budget calculation error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateBudgetAllocations(
  budgetItems: BudgetItem[],
  incomeSource: IncomeSource
): AllocationResult[] {
  const allocations: AllocationResult[] = [];

  for (const item of budgetItems) {
    const allocation = calculateSingleAllocation(
      item,
      incomeSource,
      allocations
    );
    allocations.push(allocation);
  }

  return allocations;
}

function calculateSingleAllocation(
  budgetItem: BudgetItem,
  incomeSource: IncomeSource,
  existingAllocations: AllocationResult[]
): AllocationResult {
  let expectedAmount = 0;
  const calculationDetails: AllocationResult["calculation_details"] = {
    base_amount: 0,
    calculation_type: budgetItem.calc_type,
  };

  switch (budgetItem.calc_type) {
    case "FIXED":
      expectedAmount = budgetItem.value;
      calculationDetails.base_amount = budgetItem.value;
      break;

    case "GROSS_PERCENT":
      expectedAmount = (incomeSource.gross_amount * budgetItem.value) / 100;
      calculationDetails.base_amount = incomeSource.gross_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "NET_PERCENT":
      expectedAmount = (incomeSource.net_amount * budgetItem.value) / 100;
      calculationDetails.base_amount = incomeSource.net_amount;
      calculationDetails.percentage = budgetItem.value;
      break;

    case "REMAINING_PERCENT":
      const dependentTotal = budgetItem.depends_on.reduce((total, depId) => {
        const depAllocation = existingAllocations.find(
          (a) => a.budget_item_id === depId
        );
        return total + (depAllocation?.expected_amount || 0);
      }, 0);

      const remainingAmount = incomeSource.net_amount - dependentTotal;
      expectedAmount = (remainingAmount * budgetItem.value) / 100;
      calculationDetails.base_amount = remainingAmount;
      calculationDetails.percentage = budgetItem.value;
      calculationDetails.depends_on_total = dependentTotal;
      break;

    default:
      console.warn(`Unknown calculation type: ${budgetItem.calc_type}`);
      expectedAmount = 0;
  }

  return {
    budget_item_id: budgetItem.id,
    expected_amount: Math.round(expectedAmount * 100) / 100,
    calculation_details: calculationDetails,
  };
}
