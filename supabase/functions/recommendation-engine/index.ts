import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RecommendationRequest {
  user_id: string;
  pay_period_id: string;
  surplus_amount: number;
  user_preferences?: {
    emergency_fund_target?: number;
    debt_payoff_priority?: "highest_interest" | "smallest_balance" | "custom";
    savings_goals?: Array<{
      name: string;
      target_amount: number;
      priority: number;
    }>;
  };
}

interface Recommendation {
  id: string;
  type:
    | "emergency_fund"
    | "debt_payment"
    | "savings_goal"
    | "investment"
    | "buffer";
  target_item?: string;
  amount: number;
  priority: number;
  reason: string;
  impact_description: string;
}

Deno.serve(async (req: Request) => {
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
      pay_period_id,
      surplus_amount,
      user_preferences,
    }: RecommendationRequest = await req.json();

    if (!user_id || !pay_period_id || surplus_amount === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (surplus_amount <= 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: [],
          message: "No surplus amount available for allocation",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's financial state
    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true);

    // Generate recommendations
    const recommendations = generateRecommendations(
      surplus_amount,
      budgetItems || []
    );

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        surplus_amount,
        total_allocated: recommendations.reduce(
          (sum, rec) => sum + rec.amount,
          0
        ),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Recommendation engine error:", error);
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

function generateRecommendations(
  surplusAmount: number,
  budgetItems: any[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let remainingAmount = surplusAmount;

  // Emergency Fund Priority
  const emergencyItems = budgetItems.filter(
    (item) =>
      item.category.toLowerCase().includes("savings") ||
      item.category.toLowerCase().includes("emergency")
  );

  if (emergencyItems.length > 0 && remainingAmount > 0) {
    const emergencyAllocation = Math.min(
      remainingAmount * 0.4,
      remainingAmount
    );

    recommendations.push({
      id: crypto.randomUUID(),
      type: "emergency_fund",
      amount: Math.round(emergencyAllocation * 100) / 100,
      priority: 1,
      reason: "Build emergency fund for financial security",
      impact_description: "Provides safety net for unexpected expenses",
    });

    remainingAmount -= emergencyAllocation;
  }

  // Debt Payment
  const debtItems = budgetItems.filter((item) =>
    item.category.toLowerCase().includes("debt")
  );

  if (debtItems.length > 0 && remainingAmount > 0) {
    const debtAllocation = Math.min(remainingAmount * 0.4, remainingAmount);

    recommendations.push({
      id: crypto.randomUUID(),
      type: "debt_payment",
      target_item: debtItems[0]?.name || "Debt payment",
      amount: Math.round(debtAllocation * 100) / 100,
      priority: 2,
      reason: "Pay down debt to reduce interest costs",
      impact_description: "Reduces long-term interest payments",
    });

    remainingAmount -= debtAllocation;
  }

  // Buffer for remaining amount
  if (remainingAmount > 0) {
    recommendations.push({
      id: crypto.randomUUID(),
      type: "buffer",
      amount: Math.round(remainingAmount * 100) / 100,
      priority: 3,
      reason: "Keep as buffer for unexpected expenses",
      impact_description: "Provides flexibility for unplanned costs",
    });
  }

  return recommendations.filter((rec) => rec.amount > 0);
}
