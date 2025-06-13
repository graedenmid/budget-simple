import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PayPeriodGenerationRequest {
  income_source_id: string;
  user_id: string;
  force_generate?: boolean; // Optional flag to force generation even if one exists
}

interface PayPeriodCalculation {
  start_date: string;
  end_date: string;
  expected_net: number;
  days_in_period: number;
}

// Cadence calculation functions
function calculateNextPayPeriod(
  cadence: string,
  lastPeriodEndDate: string,
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
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    expected_net: expectedNet,
    days_in_period: daysInPeriod,
  };
}

function calculateFirstPayPeriod(
  cadence: string,
  incomeStartDate: string,
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
      if (startDate.getDate() <= 15) {
        startDate.setDate(1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), 15);
      } else {
        startDate.setDate(16);
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
      }
      break;

    case "monthly":
      startDate.setDate(1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      break;

    case "quarterly":
      const quarterStartMonth = Math.floor(startDate.getMonth() / 3) * 3;
      startDate.setMonth(quarterStartMonth, 1);
      endDate = new Date(startDate.getFullYear(), quarterStartMonth + 3, 0);
      break;

    case "annual":
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
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    expected_net: expectedNet,
    days_in_period: daysInPeriod,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      income_source_id,
      user_id,
      force_generate = false,
    }: PayPeriodGenerationRequest = await req.json();

    // Validate that the user can only generate pay periods for themselves
    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Cannot generate pay periods for other users",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the income source and validate it's active
    const { data: incomeSource, error: incomeError } = await supabaseClient
      .from("income_sources")
      .select("*")
      .eq("id", income_source_id)
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    if (incomeError || !incomeSource) {
      return new Response(
        JSON.stringify({ error: "Income source not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if there's already an active pay period for this income source
    const { data: existingActivePeriod } = await supabaseClient
      .from("pay_periods")
      .select("*")
      .eq("income_source_id", income_source_id)
      .eq("user_id", user_id)
      .eq("status", "ACTIVE")
      .single();

    if (existingActivePeriod && !force_generate) {
      return new Response(
        JSON.stringify({
          error: "Active pay period already exists for this income source",
          existing_period: existingActivePeriod,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the latest pay period for this income source to determine next period dates
    const { data: latestPeriod } = await supabaseClient
      .from("pay_periods")
      .select("*")
      .eq("income_source_id", income_source_id)
      .eq("user_id", user_id)
      .order("end_date", { ascending: false })
      .limit(1)
      .single();

    let calculation: PayPeriodCalculation;

    if (latestPeriod) {
      // Calculate next period based on the last one
      calculation = calculateNextPayPeriod(
        incomeSource.cadence,
        latestPeriod.end_date,
        incomeSource.net_amount
      );
    } else {
      // Calculate first period
      calculation = calculateFirstPayPeriod(
        incomeSource.cadence,
        incomeSource.start_date,
        incomeSource.net_amount
      );
    }

    // Create the new pay period
    const { data: newPayPeriod, error: createError } = await supabaseClient
      .from("pay_periods")
      .insert({
        user_id: user_id,
        income_source_id: income_source_id,
        start_date: calculation.start_date,
        end_date: calculation.end_date,
        expected_net: calculation.expected_net,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating pay period:", createError);
      return new Response(
        JSON.stringify({
          error: "Failed to create pay period",
          details: createError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If force_generate was used and there was an existing active period, mark it as completed
    if (force_generate && existingActivePeriod) {
      await supabaseClient
        .from("pay_periods")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", existingActivePeriod.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pay_period: newPayPeriod,
        message: "Pay period generated successfully",
        calculation_details: {
          cadence: incomeSource.cadence,
          days_in_period: calculation.days_in_period,
          is_first_period: !latestPeriod,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Pay period generation error:", error);
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
