import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface IncomeCalculationRequest {
  user_id: string;
  income_source_id: string;
  target_cadence: string;
  start_date: string;
  end_date: string;
}

interface IncomeProration {
  original_gross: number;
  original_net: number;
  prorated_gross: number;
  prorated_net: number;
  cadence_conversion: {
    from: string;
    to: string;
    multiplier: number;
  };
  period_details: {
    days_in_period: number;
    days_in_original_period: number;
    proration_factor: number;
  };
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
      income_source_id,
      target_cadence,
      start_date,
      end_date,
    }: IncomeCalculationRequest = await req.json();

    if (!user_id || !income_source_id || !target_cadence) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get income source
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

    // Calculate pro-rated income
    const prorationResult = calculateIncomeProration(
      incomeSource,
      target_cadence,
      start_date,
      end_date
    );

    return new Response(
      JSON.stringify({
        success: true,
        income_source: incomeSource,
        proration: prorationResult,
        calculations: {
          original_annual_gross: convertToAnnual(
            incomeSource.gross_amount,
            incomeSource.cadence
          ),
          original_annual_net: convertToAnnual(
            incomeSource.net_amount,
            incomeSource.cadence
          ),
          target_period_gross: prorationResult.prorated_gross,
          target_period_net: prorationResult.prorated_net,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Income calculation error:", error);
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

function calculateIncomeProration(
  incomeSource: any,
  targetCadence: string,
  startDate?: string,
  endDate?: string
): IncomeProration {
  const sourceCadence = incomeSource.cadence;

  // Convert source income to daily rate
  const sourceDaysPerPeriod = getCadenceDays(sourceCadence);
  const targetDaysPerPeriod = getCadenceDays(targetCadence);

  const dailyGrossRate = incomeSource.gross_amount / sourceDaysPerPeriod;
  const dailyNetRate = incomeSource.net_amount / sourceDaysPerPeriod;

  // Calculate target period amounts
  let periodDays = targetDaysPerPeriod;
  let prorationFactor = 1;

  // If specific dates provided, calculate exact period
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    periodDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    prorationFactor = periodDays / targetDaysPerPeriod;
  }

  const proratedGross = dailyGrossRate * periodDays;
  const proratedNet = dailyNetRate * periodDays;

  return {
    original_gross: incomeSource.gross_amount,
    original_net: incomeSource.net_amount,
    prorated_gross: Math.round(proratedGross * 100) / 100,
    prorated_net: Math.round(proratedNet * 100) / 100,
    cadence_conversion: {
      from: sourceCadence,
      to: targetCadence,
      multiplier: targetDaysPerPeriod / sourceDaysPerPeriod,
    },
    period_details: {
      days_in_period: periodDays,
      days_in_original_period: sourceDaysPerPeriod,
      proration_factor: Math.round(prorationFactor * 10000) / 10000,
    },
  };
}

function getCadenceDays(cadence: string): number {
  const cadenceMap: { [key: string]: number } = {
    weekly: 7,
    "bi-weekly": 14,
    "semi-monthly": 15.22, // 365.25 / 24
    monthly: 30.44, // 365.25 / 12
    quarterly: 91.31, // 365.25 / 4
    "semi-annual": 182.63, // 365.25 / 2
    annual: 365.25,
  };

  return cadenceMap[cadence.toLowerCase()] || 30.44; // Default to monthly
}

function convertToAnnual(amount: number, cadence: string): number {
  const daysPerPeriod = getCadenceDays(cadence);
  const periodsPerYear = 365.25 / daysPerPeriod;
  return Math.round(amount * periodsPerYear * 100) / 100;
}
